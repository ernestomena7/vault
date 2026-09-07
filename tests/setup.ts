import '../src/lib/config/load-env';

/**
 * Test environment.
 *
 * `||=` rather than `??=`: .env.local defines these keys with empty values
 * until the Dropbox app is configured, and an empty string is not undefined.
 *
 * The default run uses the in-memory storage adapter and never reaches the
 * network (Constitution V). Anything that would really call Dropbox is opt-in
 * behind VAULT_TEST_DROPBOX.
 */
process.env.AUTH_SECRET ||= 'test-secret-value-that-is-at-least-32-chars';
process.env.AUTH_URL ||= 'http://localhost:3000';
process.env.DROPBOX_APP_KEY ||= 'test-app-key';
process.env.DROPBOX_APP_SECRET ||= 'test-app-secret';
process.env.DROPBOX_REFRESH_TOKEN ||= 'test-refresh-token';
process.env.DROPBOX_ROOT_PATH ||= '';
process.env.UPLOAD_CHUNK_SIZE_BYTES ||= String(8 * 1024 * 1024);

/**
 * Integration tests get their own schema, always — never the development
 * database. Overridden, not defaulted, so a populated .env.local cannot point
 * the suite at real data.
 */
process.env.DATABASE_URL = testDatabaseUrl();

export function testDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? 'mysql://vault:vault@127.0.0.1:3307/vault';
  return base.replace(/\/([^/?]+)(\?|$)/, '/vault_test$2');
}
