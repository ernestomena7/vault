import '../src/lib/config/load-env';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

/**
 * Applies the committed SQL migrations, forward only.
 *
 * Schema is never modified by hand against a live database (Constitution V).
 * Run against local MySQL and against the Hostinger database alike.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const connection = await mysql.createConnection({ uri: url, multipleStatements: true });
const db = drizzle(connection);

console.log('Applying migrations...');
await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
console.log('Migrations applied.');

await connection.end();
