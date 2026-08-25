import 'dotenv/config';
import {spawnSync} from 'node:child_process';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL before running server tests.');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const pushed = spawnSync(
  npx,
  ['prisma', 'db', 'push', '--schema', 'server/prisma/schema.prisma', '--skip-generate'],
  {stdio: 'inherit', env: process.env}
);

if (pushed.status) process.exit(pushed.status);

await import('../prisma/seed.js');
