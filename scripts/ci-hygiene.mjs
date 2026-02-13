import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = process.cwd();

function getDiffText() {
  const commands = [
    "git diff --unified=0 --diff-filter=ACMR HEAD",
    "git diff --unified=0 --diff-filter=ACMR",
  ];

  for (const command of commands) {
    try {
      const output = execSync(command, { cwd: ROOT, encoding: "utf8" });
      if (output.trim().length > 0) {
        return output;
      }
    } catch {
      // try next command
    }
  }

  return "";
}

function shouldInspectFile(filePath) {
  return (
    /^(client|server|shared)\//.test(filePath) &&
    /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)
  );
}

function isCodeLineInDiff(line) {
  return line.startsWith("+") && !line.startsWith("+++");
}

function getTrackedFiles() {
  try {
    const output = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isCommentOnlyLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("*/")
  );
}

function isConsoleLogAllowlisted(filePath) {
  const allowlist = [
    /^server\/vite\.ts$/,
  ];
  return allowlist.some((pattern) => pattern.test(filePath));
}

function runGlobalConsoleChecks(violations) {
  const trackedFiles = getTrackedFiles().filter(shouldInspectFile);

  for (const filePath of trackedFiles) {
    if (isConsoleLogAllowlisted(filePath)) {
      continue;
    }

    let fileContent = "";
    try {
      fileContent = readFileSync(`${ROOT}/${filePath}`, "utf8");
    } catch {
      continue;
    }

    const lines = fileContent.split("\n");
    lines.forEach((line, index) => {
      if (isCommentOnlyLine(line)) {
        return;
      }

      if (/\bconsole\.(log|warn)\s*\(/.test(line)) {
        violations.push(`${filePath}:${index + 1}: remove console.log/console.warn from committed code`);
      }
    });
  }
}

const diff = getDiffText();
const violations = [];
let currentFile = "";
if (diff) {
  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice(6);
      continue;
    }

    if (!currentFile || !shouldInspectFile(currentFile) || !isCodeLineInDiff(rawLine)) {
      continue;
    }

    const line = rawLine.slice(1);
    const trimmed = line.trim();

    // Ban obvious commented-out code additions.
    if (
      /^\s*\/\//.test(line) &&
      /\bif\s*\(|\bfor\s*\(|\bwhile\s*\(|\bswitch\s*\(|\breturn\b|\bawait\b|\bconst\b|\blet\b|\bvar\b|\bfunction\b|\btry\b|\bcatch\b|\{\s*$|\}\s*$/.test(line)
    ) {
      violations.push(`${currentFile}: remove commented-out code -> ${trimmed}`);
    }

    // Keep new core-domain code strongly typed.
    if (currentFile.startsWith("server/domains/") && /\bany\b/.test(line)) {
      violations.push(`${currentFile}: avoid adding 'any' in server domain code -> ${trimmed}`);
    }
  }
}

// Enforce console hygiene repository-wide.
runGlobalConsoleChecks(violations);

if (violations.length > 0) {
  console.error("Hygiene checks failed:\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Hygiene checks passed.");
