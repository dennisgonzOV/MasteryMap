import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function getDomainFiles() {
  try {
    const output = execSync(
      "rg --files server/domains -g '*.ts' -g '*.tsx' -g '*.mts' -g '*.cts'",
      { cwd: ROOT, encoding: "utf8" },
    );

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function extractDomain(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const match = normalized.match(/server\/domains\/([^/]+)\//);
  return match?.[1] ?? null;
}

function resolveImportPath(fromFile, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const basePath = path.resolve(ROOT, path.dirname(fromFile), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mts`,
    `${basePath}.cts`,
    `${basePath}.js`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const stats = statSync(candidate);
    if (stats.isFile()) {
      return path.relative(ROOT, candidate).replaceAll("\\", "/");
    }
  }

  return null;
}

function isFacadeImport(specifier) {
  const normalized = specifier.replaceAll("\\", "/");
  return /^(\.\.\/)+(?:domains\/)?[a-z-]+(?:\/(?:index|facade|gateway))?$/.test(normalized);
}

function collectImportSpecifiers(line) {
  const specifiers = [];

  const fromMatch = line.match(/\b(?:import|export)\b[^'"\n]*\bfrom\s+['"]([^'"]+)['"]/);
  if (fromMatch?.[1]) {
    specifiers.push(fromMatch[1]);
  }

  const dynamicMatch = line.match(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/);
  if (dynamicMatch?.[1]) {
    specifiers.push(dynamicMatch[1]);
  }

  return specifiers;
}

const files = getDomainFiles();
const violations = [];

for (const file of files) {
  const fromDomain = extractDomain(file);
  if (!fromDomain) {
    continue;
  }

  const content = readFileSync(path.join(ROOT, file), "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const specifiers = collectImportSpecifiers(line);

    for (const specifier of specifiers) {
      const resolvedImport = resolveImportPath(file, specifier);
      if (!resolvedImport) {
        continue;
      }

      const toDomain = extractDomain(resolvedImport);
      if (!toDomain || toDomain === fromDomain) {
        continue;
      }

      if (isFacadeImport(specifier)) {
        continue;
      }

      violations.push(
        `${file}:${index + 1} direct cross-domain import \"${specifier}\" (${fromDomain} -> ${toDomain}). Use the domain facade import (e.g. \"../${toDomain}\") or a local gateway.`,
      );
    }
  });
}

if (violations.length > 0) {
  console.error("Architecture boundary checks failed:\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Architecture boundary checks passed.");
