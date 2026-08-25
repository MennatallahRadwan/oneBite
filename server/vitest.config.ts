import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/src/**/*.test.ts'],
    setupFiles: ['server/vitest.setup.ts'],
    // Tests should run against TEST_DATABASE_URL, not the development database.
    // Files still run one at a time because order tests reserve shared seeded
    // capacity/slots; parallelizing safely needs per-file fixture isolation.
    fileParallelism: false,
    // Still generous: these hit a real database and one test deliberately makes
    // transactions contend and retry.
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
