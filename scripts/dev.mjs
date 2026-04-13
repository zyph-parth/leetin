import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

mkdirSync('.next', { recursive: true });
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

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
