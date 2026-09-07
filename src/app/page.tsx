import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

/**
 * Vault has no public landing page. Signed in, you go to your work; signed out,
 * you go to sign-in.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? '/upload' : '/sign-in');
}
