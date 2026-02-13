import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();

function getChangedFiles() {
  const commands = [
    'git diff --name-only --diff-filter=ACMR HEAD',
    'git diff --name-only --diff-filter=ACMR',
  ];

  for (const command of commands) {
    try {
      const output = execSync(command, { cwd: ROOT, encoding: 'utf8' });
      const files = output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (files.length > 0) {
        return files;
      }
    } catch {
      // continue
    }
  }

  return [];
}

const relatedFiles = getChangedFiles().filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) && existsSync(file));

if (relatedFiles.length === 0) {
  console.log('No touched source files detected. Skipping module tests.');
  process.exit(0);
}

console.log(`Running related tests for ${relatedFiles.length} touched files...`);

const result = spawnSync(
  'npx',
  ['vitest', 'related', '--run', '--passWithNoTests', ...relatedFiles],
  {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  },
);

process.exit(result.status ?? 1);
