/**
 * Test stub for the `server-only` package.
 *
 * In a Next build, `server-only` fails the build if a server module is pulled
 * into a client bundle. That protection is a build-time concern; under Vitest
 * the real package would simply refuse to load the modules under test.
 * The boundary it guards is still enforced where it matters — in `next build`.
 */
export {};
