import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
      // fall through to next command
    }
  }

  return [];
}

function toModuleRoot(file) {
  if (file.startsWith('server/domains/')) {
    const parts = file.split('/');
    return `server/domains/${parts[2]}`;
  }

  if (file.startsWith('server/')) {
    return 'server';
  }

  if (file.startsWith('client/src/')) {
    return 'client/src';
  }

  if (file.startsWith('shared/')) {
    return 'shared';
  }

  return null;
}

const touchedTypeFiles = getChangedFiles().filter((file) => /\.(ts|tsx|mts|cts)$/.test(file) && existsSync(file));
const moduleRoots = Array.from(new Set(touchedTypeFiles.map(toModuleRoot).filter(Boolean)));

if (moduleRoots.length === 0) {
  console.log('No touched TypeScript modules detected. Skipping touched-module typecheck.');
  process.exit(0);
}

const baseConfig = JSON.parse(readFileSync(join(ROOT, 'tsconfig.json'), 'utf8'));
let failures = 0;

for (const moduleRoot of moduleRoots) {
  const tempConfigPath = join(ROOT, `.tsconfig.touched.${moduleRoot.replace(/[^a-zA-Z0-9]/g, '_')}.json`);

  const include = [`${moduleRoot}/**/*`];
  if (moduleRoot !== 'shared') {
    include.push('shared/**/*');
  }

  const tempConfig = {
    ...baseConfig,
    include,
    compilerOptions: {
      ...(baseConfig.compilerOptions || {}),
      incremental: false,
      tsBuildInfoFile: `./node_modules/typescript/tsbuildinfo.${moduleRoot.replace(/[^a-zA-Z0-9]/g, '_')}`,
    },
  };

  writeFileSync(tempConfigPath, `${JSON.stringify(tempConfig, null, 2)}\n`);
  console.log(`Typechecking touched module: ${moduleRoot}`);

  const result = spawnSync('npx', ['tsc', '-p', tempConfigPath], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });

  unlinkSync(tempConfigPath);

  if (result.status !== 0) {
    failures += 1;
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log('Touched-module typecheck passed.');
