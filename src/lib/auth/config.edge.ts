import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * Middleware runs on the edge runtime, where the MySQL driver cannot load. This
 * half carries no providers and no database access, so middleware can decide
 * "is there a session cookie at all" cheaply. It is a first gate, never the
 * authorization decision — that always happens server-side per route, against
 * the database (Constitution IV, FR-003).
 */
export const edgeAuthConfig: NextAuthConfig = {
  providers: [],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = Number(user.id);
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId);
      }
      return session;
    },
  },
  trustHost: true,
};
