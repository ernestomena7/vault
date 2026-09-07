import { config } from 'dotenv';

/**
 * Loads environment files for standalone scripts and the test runner.
 *
 * Next.js reads `.env.local` on its own, but scripts run outside Next do not —
 * they only see `.env` unless told otherwise. Secrets live in `.env.local`
 * (git-ignored), so it is listed first and wins.
 */
config({ path: ['.env.local', '.env'], quiet: true });
