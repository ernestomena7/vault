import NextAuth from 'next-auth';
import { edgeAuthConfig } from '@/lib/auth/config.edge';

/**
 * First gate: no session cookie, no screen (FR-001).
 *
 * Named `proxy.ts`: Next 16 renamed the middleware file convention.
 *
 * This runs on the edge and therefore cannot read the database, so it answers
 * only "is anyone signed in". Role checks happen server-side per route in
 * guards.ts. Deleting this file would not open a hole — it would only move the
 * refusal from the edge to the handler.
 */
const { auth: middleware } = NextAuth(edgeAuthConfig);

export default middleware;

export const config = {
  matcher: [
    /**
     * Screens only — every one except sign-in and the static assets.
     *
     * API routes are deliberately excluded. Redirecting them would answer an
     * API client with a 307 to an HTML page instead of the `401` its contract
     * promises, and any caller parsing the response as JSON would choke on it.
     * They are not left open: each one calls requireUser or requireAdmin, which
     * refuse anonymous callers with a proper error envelope
     * (see tests/integration/authorization.test.ts).
     */
    '/((?!sign-in|api|_next/static|_next/image|favicon.ico).*)',
  ],
};
