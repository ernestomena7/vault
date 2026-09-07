import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * The default run uses the in-memory fake storage adapter and a scratch MySQL
 * schema, so `npm test` completes with no network access (Constitution V).
 * A suite that needs the internet to pass has broken that rule.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside a React Server Component graph, which the
      // test runner is not. The guarantee it enforces is a build-time one for
      // Next; here it would only block importing the modules under test.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // Integration tests share a scratch database; run files serially so they
    // cannot race each other's fixtures.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
