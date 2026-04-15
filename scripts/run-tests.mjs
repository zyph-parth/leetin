import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const outDir = resolve(rootDir, '.tmp-tests');
const tscEntrypoint = resolve(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

rmSync(outDir, { recursive: true, force: true });

const compile = spawnSync(
  process.execPath,
  [
    tscEntrypoint,
    '--module', 'nodenext',
    '--moduleResolution', 'nodenext',
    '--target', 'es2022',
    '--outDir', outDir,
    '--rootDir', rootDir,
    '--esModuleInterop',
    '--skipLibCheck',
    '--isolatedModules', 'false',
    'tests/core.test.ts',
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
  },
);

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const run = spawnSync(
  process.execPath,
  [join(outDir, 'tests', 'core.test.js')],
  {
    cwd: rootDir,
    stdio: 'inherit',
  },
);

rmSync(outDir, { recursive: true, force: true });
process.exit(run.status ?? 1);
