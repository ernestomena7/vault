import '../src/lib/config/load-env';
import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';

/**
 * One-time Dropbox authorization.
 *
 * The app key and secret identify the application; they do not grant access to
 * anybody's files. Dropbox requires the account holder to approve the app once,
 * which yields a refresh token the server can then use indefinitely.
 *
 * This does that exchange and writes the token straight into .env.local, so the
 * token never has to be pasted into a chat, an issue tracker, or a terminal
 * history where it would linger.
 *
 *   npm run dropbox:connect
 */
const SCOPES = [
  'files.content.write',
  'files.content.read',
  'files.metadata.read',
  'sharing.write',
];

const key = process.env.DROPBOX_APP_KEY;
const secret = process.env.DROPBOX_APP_SECRET;

if (!key || !secret) {
  console.error('Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET in .env.local first.');
  process.exit(1);
}

const authorizeUrl =
  'https://www.dropbox.com/oauth2/authorize' +
  `?client_id=${encodeURIComponent(key)}` +
  '&response_type=code' +
  '&token_access_type=offline' +
  `&scope=${encodeURIComponent(SCOPES.join(' '))}`;

console.log('\n1. Open this in a browser and approve the app:\n');
console.log(`   ${authorizeUrl}\n`);
console.log('2. Dropbox will show you a short code. Paste it below.\n');
console.log('   If it refuses the scopes, enable them on the app\'s Permissions');
console.log('   tab and press Submit first — scopes do not apply until submitted.\n');

const rl = createInterface({ input: stdin, output: stdout });
const code = (await rl.question('Authorization code: ')).trim();
rl.close();

if (!code) {
  console.error('\nNo code entered. Nothing was changed.');
  process.exit(1);
}

const response = await fetch('https://api.dropbox.com/oauth2/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ code, grant_type: 'authorization_code' }),
});

const payload = (await response.json().catch(() => ({}))) as {
  refresh_token?: string;
  error_description?: string;
  error?: string;
};

if (!response.ok || !payload.refresh_token) {
  console.error(`\nDropbox refused the exchange: ${payload.error_description ?? payload.error ?? response.status}`);
  console.error('An authorization code is single-use and expires within minutes — if you');
  console.error('reused one or waited too long, start again from step 1.');
  process.exit(1);
}

// Write it in place, preserving everything else in the file.
const path = '.env.local';
const contents = readFileSync(path, 'utf8');
const line = `DROPBOX_REFRESH_TOKEN="${payload.refresh_token}"`;

const updated = /^DROPBOX_REFRESH_TOKEN=.*$/m.test(contents)
  ? contents.replace(/^DROPBOX_REFRESH_TOKEN=.*$/m, line)
  : `${contents.trimEnd()}\n${line}\n`;

writeFileSync(path, updated, 'utf8');

console.log('\nConnected. The refresh token is in .env.local — it is git-ignored,');
console.log('and it was never printed here.');
console.log('\nRestart the dev server so it picks up the new value, then:');
console.log('  npm run db:import-taxonomy   # build the taxonomy from your Dropbox folders');
