import 'server-only';
import mysql from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { getDatabaseEnv } from '@/lib/config/env';
import * as schema from './schema';

/**
 * MySQL access. Database credentials stay server-side (Constitution IV).
 *
 * Everything here is created lazily, on first query rather than on import.
 * Next collects page data at build time by evaluating modules, and a pool built
 * at module scope would demand a full environment — and a reachable database —
 * just to produce a build. Configuration still fails fast, but at the first
 * request that needs it, which is where the failure is meaningful.
 *
 * The pool is memoized across hot reloads so a long dev session does not
 * exhaust connections.
 */
const globalForDb = globalThis as unknown as {
  vaultPool?: mysql.Pool;
  vaultDb?: MySql2Database<typeof schema>;
};

export function getPool(): mysql.Pool {
  if (globalForDb.vaultPool) return globalForDb.vaultPool;

  const created = mysql.createPool({
    uri: getDatabaseEnv().DATABASE_URL,
    connectionLimit: 10,
    // Shared hosting: fail fast rather than hanging a request slot.
    connectTimeout: 10_000,
    timezone: 'Z',
    supportBigNumbers: true,
  });

  globalForDb.vaultPool = created;
  return created;
}

function getDb(): MySql2Database<typeof schema> {
  globalForDb.vaultDb ??= drizzle(getPool(), { schema, mode: 'default' });
  return globalForDb.vaultDb;
}

/**
 * The database handle. A proxy so that `import { db }` costs nothing until a
 * query is actually issued.
 */
export const db: MySql2Database<typeof schema> = new Proxy(
  {} as MySql2Database<typeof schema>,
  {
    get(_target, property, receiver) {
      return Reflect.get(getDb(), property, receiver) as unknown;
    },
    has(_target, property) {
      return Reflect.has(getDb(), property);
    },
  },
);

export type Database = MySql2Database<typeof schema>;
export { schema };
