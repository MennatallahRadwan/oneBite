import 'dotenv/config';
import {spawnSync} from 'node:child_process';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL before running server tests.');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const isWindows = process.platform === 'win32';
const npx = isWindows ? 'npx.cmd' : 'npx';
const pushed = spawnSync(
  npx,
  ['prisma', 'db', 'push', '--schema', 'server/prisma/schema.prisma', '--skip-generate'],
  // Node refuses to spawn a .cmd shim without a shell, and that failure reports
  // status null, which would otherwise let an unmigrated database through.
  {stdio: 'inherit', env: process.env, shell: isWindows}
);

if (pushed.error) throw pushed.error;
if (pushed.status !== 0) process.exit(pushed.status ?? 1);

await import('../prisma/seed.js');
