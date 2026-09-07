import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { credentialsSchema } from '@/lib/validation';
import { getAuthEnv } from '@/lib/config/env';
import { verifyPassword } from './password';
import { edgeAuthConfig } from './config.edge';

/**
 * Authentication.
 *
 * The session cookie is a JWT carrying only the user id. Auth.js requires the
 * JWT strategy with the Credentials provider — database sessions are not
 * available there.
 *
 * That is not a weakness here, because every authorization decision reads the
 * user row from the database on the request it happens (see guards.ts). A role
 * change or a deactivation therefore takes effect on the user's very next
 * request (US5 scenario 2), which is what a database session was wanted for.
 * The cookie is an identity claim, never a permission claim.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...edgeAuthConfig,
  // Validated here so a missing or too-short AUTH_SECRET produces a clear
  // message rather than a generic Auth.js configuration error.
  secret: getAuthEnv().AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = found[0];

        // Hash a throwaway value when the account is absent so the response
        // time does not reveal whether the email exists (US1 scenario 4).
        const hash = user?.passwordHash ?? '16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA';
        const correct = await verifyPassword(password, hash);

        // An inactive account is refused exactly like a wrong password — the
        // caller learns nothing either way.
        if (!user || !correct || !user.isActive) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});
