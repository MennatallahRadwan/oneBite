import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/src/**/*.test.ts'],
    // Every file shares one PostgreSQL and reserves real production capacity
    // and delivery slots, releasing them in afterAll. Run in parallel they
    // contend for the same earliest slots and interleave with each other's
    // cleanup, which showed up as orders that should have succeeded coming back
    // 409, and as connection-pool exhaustion surfacing as 500s. Files therefore
    // run one at a time; tests inside a file still run concurrently, which is
    // what order-concurrency.test.ts relies on.
    fileParallelism: false,
    // Still generous: these hit a real database and one test deliberately makes
    // transactions contend and retry.
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
