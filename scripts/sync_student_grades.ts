import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { eq, sql } from "drizzle-orm";

type GradeRow = {
  username: string;
  grade: string;
};

type ParsedArgs = {
  spreadsheetPath: string;
  apply: boolean;
  envVar: string;
};

const execFileAsync = promisify(execFile);

const DEFAULT_SPREADSHEET_PATH = "/Users/dennis/Downloads/students.xlsx";
const DEFAULT_DATABASE_ENV = "PRODUCTION_DATABASE_URL";

const PYTHON_PARSE_XLSX = `
import json
import sys
from openpyxl import load_workbook

path = sys.argv[1]
wb = load_workbook(path, data_only=True)
ws = wb[wb.sheetnames[0]]

header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
headers = [(str(cell).strip() if cell is not None else "") for cell in header_row]

rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
    for index, value in enumerate(row):
        if value is None:
            continue
        username = str(value).strip()
        if not username:
            continue
        grade = headers[index] if index < len(headers) else ""
        rows.append({
            "username": username,
            "grade": str(grade).strip(),
        })

print(json.dumps(rows))
`;

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let spreadsheetPath = DEFAULT_SPREADSHEET_PATH;
  let apply = false;
  let envVar = DEFAULT_DATABASE_ENV;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--file") {
      const next = args[i + 1];
      if (!next) throw new Error("Missing value for --file");
      spreadsheetPath = next;
      i += 1;
      continue;
    }

    if (arg === "--env") {
      const next = args[i + 1];
      if (!next) throw new Error("Missing value for --env");
      envVar = next;
      i += 1;
      continue;
    }
  }

  return { spreadsheetPath, apply, envVar };
}

function normalizeRow(row: GradeRow): GradeRow {
  return {
    username: row.username.trim(),
    grade: normalizeGrade(row.grade),
  };
}

function normalizeGrade(rawGrade: string): string {
  const grade = rawGrade.trim();
  if (!grade) return grade;

  const lower = grade.toLowerCase();

  if (lower === "k" || lower.includes("kindergarten")) {
    return "K";
  }

  const numericMatch = lower.match(/\b([0-9]{1,2})(?:st|nd|rd|th)?\b/);
  if (numericMatch) {
    return String(Number.parseInt(numericMatch[1], 10));
  }

  return grade;
}

async function parseSpreadsheet(spreadsheetPath: string): Promise<GradeRow[]> {
  const { stdout, stderr } = await execFileAsync(
    "python3",
    ["-c", PYTHON_PARSE_XLSX, spreadsheetPath],
    { maxBuffer: 10 * 1024 * 1024 },
  );

  if (stderr && stderr.trim().length > 0) {
    throw new Error(`Spreadsheet parse failed: ${stderr.trim()}`);
  }

  const parsed = JSON.parse(stdout) as GradeRow[];
  return parsed.map(normalizeRow).filter((row) => row.username.length > 0 && row.grade.length > 0);
}

async function run(): Promise<void> {
  const { spreadsheetPath, apply, envVar } = parseArgs();
  const databaseUrl = process.env[envVar];

  if (!databaseUrl) {
    throw new Error(`Environment variable ${envVar} is not set`);
  }

  const spreadsheetRows = await parseSpreadsheet(spreadsheetPath);
  if (spreadsheetRows.length === 0) {
    throw new Error("No student rows were found in the spreadsheet");
  }

  const rowsByUsername = new Map<string, GradeRow>();
  for (const row of spreadsheetRows) {
    const key = row.username.toLowerCase();
    const existing = rowsByUsername.get(key);

    if (existing && existing.grade !== row.grade) {
      throw new Error(
        `Conflicting grade values for username ${row.username}: "${existing.grade}" vs "${row.grade}"`,
      );
    }

    rowsByUsername.set(key, row);
  }

  process.env.DATABASE_URL = databaseUrl;

  const [{ db }, { users }] = await Promise.all([
    import("../server/db"),
    import("../shared/schema"),
  ]);

  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grade" varchar(32)`);

  const students = await db
    .select({
      id: users.id,
      username: users.username,
      grade: users.grade,
      role: users.role,
    })
    .from(users)
    .where(eq(users.role, "student"));

  const studentsByUsername = new Map(students.map((student) => [student.username.toLowerCase(), student]));
  const unmatchedSpreadsheetRows: GradeRow[] = [];
  const updates: Array<{ id: number; username: string; from: string; to: string }> = [];
  let alreadyCorrect = 0;

  for (const row of rowsByUsername.values()) {
    const matchedStudent = studentsByUsername.get(row.username.toLowerCase());
    if (!matchedStudent) {
      unmatchedSpreadsheetRows.push(row);
      continue;
    }

    const currentGrade = (matchedStudent.grade ?? "").trim();
    if (currentGrade === row.grade) {
      alreadyCorrect += 1;
      continue;
    }

    updates.push({
      id: matchedStudent.id,
      username: matchedStudent.username,
      from: currentGrade || "(empty)",
      to: row.grade,
    });
  }

  console.log(`Spreadsheet rows parsed: ${spreadsheetRows.length}`);
  console.log(`Unique usernames in spreadsheet: ${rowsByUsername.size}`);
  console.log(`Matched students in DB: ${rowsByUsername.size - unmatchedSpreadsheetRows.length}`);
  console.log(`Will update grades: ${updates.length}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Unmatched usernames: ${unmatchedSpreadsheetRows.length}`);

  if (unmatchedSpreadsheetRows.length > 0) {
    console.log("Unmatched usernames:");
    for (const row of unmatchedSpreadsheetRows) {
      console.log(`- ${row.username} (${row.grade})`);
    }
  }

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to write updates.");
    return;
  }

  const now = new Date();
  for (const update of updates) {
    await db
      .update(users)
      .set({ grade: update.to, updatedAt: now })
      .where(eq(users.id, update.id));
  }

  console.log(`Applied updates: ${updates.length}`);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Grade sync failed:", error);
    process.exit(1);
  });
