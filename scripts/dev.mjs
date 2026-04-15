import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const nextDir = '.next';
const stalePageManifest = join(nextDir, 'server', 'app', 'page_client-reference-manifest.js');
const missingPageModule = join(nextDir, 'server', 'app', 'page.js');
const devPidFile = join(nextDir, 'dev-server.pid');

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Recover from a partially-written Next build cache. When the manifest exists
// but the compiled server page is missing, requests can fail with ENOENT until
// the cache is cleared and rebuilt.
if (existsSync(stalePageManifest) && !existsSync(missingPageModule)) {
  rmSync(nextDir, { recursive: true, force: true });
}

mkdirSync(nextDir, { recursive: true });

if (existsSync(devPidFile)) {
  const existingPid = Number.parseInt(readFileSync(devPidFile, 'utf8').trim(), 10);
  if (isProcessAlive(existingPid)) {
    console.error(
      `Another LeetInsight dev server is already running (PID ${existingPid}). Stop it before starting a new one.`,
    );
    process.exit(1);
  }

  unlinkSync(devPidFile);
}

const localStorageFlag = '--localstorage-file=.next/dev-localstorage.json';

const child = spawn(
  process.execPath,
  [
    localStorageFlag,
    './node_modules/next/dist/bin/next',
    'dev',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

writeFileSync(devPidFile, `${child.pid ?? ''}\n`);

function cleanupPidFile() {
  if (existsSync(devPidFile)) {
    unlinkSync(devPidFile);
  }
}

process.on('SIGINT', cleanupPidFile);
process.on('SIGTERM', cleanupPidFile);

child.on('exit', (code, signal) => {
  cleanupPidFile();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
