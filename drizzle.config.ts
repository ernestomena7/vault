import './src/lib/config/load-env';
import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated as SQL files and committed to the repository, then
 * applied forward only. Schema is never modified by hand against a live
 * database (Constitution V).
 */
export default defineConfig({
  dialect: 'mysql',
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
