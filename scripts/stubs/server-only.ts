/**
 * Stub for the `server-only` package, used only when running CLI scripts.
 *
 * `server-only` throws unless it is evaluated inside a React Server Component
 * graph. Its purpose is to fail `next build` if a server module is pulled into
 * a client bundle — a real guarantee, and it stays fully enforced there.
 *
 * A CLI script is server-side by definition; there is no client bundle for a
 * secret to leak into. Mapping the package to this stub, via
 * tsconfig.scripts.json and only for scripts, lets them reuse the same
 * well-tested modules the app uses instead of duplicating them.
 */
export {};
