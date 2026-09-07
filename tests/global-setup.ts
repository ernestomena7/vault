import '../src/lib/config/load-env';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

/**
 * Creates the test schema and applies the committed migrations to it once per
 * run, so integration tests exercise the real schema rather than a hand-built
 * approximation (Constitution V).
 *
 * Skipped gracefully when no MySQL is reachable: unit and contract tests must
 * still run on a machine with nothing but Node.
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? 'mysql://vault:vault@127.0.0.1:3307/vault';
  const testUrl = url.replace(/\/([^/?]+)(\?|$)/, '/vault_test$2');
  const adminUrl = url.replace(/\/([^/?]+)(\?|$)/, '/$2');

  let admin: mysql.Connection;
  try {
    admin = await mysql.createConnection({ uri: adminUrl, connectTimeout: 3000 });
  } catch {
    console.warn(
      '\n  No MySQL reachable — integration tests will be skipped.\n' +
        '  Start one with: docker compose up -d\n',
    );
    return;
  }

  // The schema is created by docker/mysql-init on first boot; this only
  // ensures it when running against a database provisioned some other way.
  await admin
    .query('CREATE DATABASE IF NOT EXISTS `vault_test`')
    .catch(() => undefined);
  await admin.end();

  const connection = await mysql.createConnection({ uri: testUrl, multipleStatements: true });
  await migrate(drizzle(connection), { migrationsFolder: './src/lib/db/migrations' });
  await connection.end();
}
