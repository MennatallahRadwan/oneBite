import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/src/**/*.test.ts'],
    // These are integration tests against a real PostgreSQL, and the files run
    // in parallel against one database, so the 5s default is too tight — the
    // concurrency test deliberately makes transactions contend and retry.
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
