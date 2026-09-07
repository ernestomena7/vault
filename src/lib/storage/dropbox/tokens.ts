import 'server-only';
import { ConfigurationError, getDropboxEnv } from '@/lib/config/env';
import { StorageUnavailableError } from '../port';

/**
 * Dropbox token minting.
 *
 * Two kinds of token come out of here, and the difference matters:
 *
 *  - A *server* token carrying every granted scope, used by the adapter for
 *    folder creation, metadata, moves and links. It never leaves the server.
 *
 *  - A *browser* token reduced to `files.content.write` and nothing else, issued
 *    per upload. Dropbox's token endpoint accepts a `scope` parameter naming a
 *    subset of the granted scopes, which is what makes "narrowly scoped" in
 *    Constitution IV true rather than aspirational.
 *
 * The refresh token and app secret stay here. Neither is ever returned to a
 * caller or serialized into a response (research.md R-002).
 */

const TOKEN_ENDPOINT = 'https://api.dropbox.com/oauth2/token';

/** The only scope a browser-held token is allowed to carry. */
export const BROWSER_UPLOAD_SCOPE = 'files.content.write';

/** Refresh a little early so a token cannot expire mid-operation. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

interface MintedToken {
  accessToken: string;
  expiresAt: Date;
}

let serverToken: MintedToken | undefined;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error_description?: string;
  error?: string;
}

async function requestToken(scope?: string): Promise<MintedToken> {
  const env = getDropboxEnv();

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.DROPBOX_REFRESH_TOKEN,
  });
  if (scope) {
    // Requesting a subset of the granted scopes. This is the whole mitigation
    // for handing a credential to the browser.
    body.set('scope', scope);
  }

  const credentials = Buffer.from(`${env.DROPBOX_APP_KEY}:${env.DROPBOX_APP_SECRET}`).toString(
    'base64',
  );

  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
    });
  } catch (cause) {
    throw new StorageUnavailableError('Could not reach Dropbox to obtain an access token', {
      cause,
    });
  }

  const payload = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !payload.access_token) {
    const detail = payload.error_description ?? payload.error ?? `HTTP ${response.status}`;
    throw new StorageUnavailableError(`Dropbox refused the token request: ${detail}`);
  }

  const lifetimeMs = (payload.expires_in ?? 14_400) * 1000;
  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + lifetimeMs),
  };
}

/** A full-scope token for server-side use. Memoized until shortly before expiry. */
export async function getServerAccessToken(): Promise<string> {
  // The refresh token wins whenever one is configured: it auto-renews, so the
  // running app never sits on a token that quietly goes stale. The pasted
  // App Console token is for one-off server work done *before* a refresh token
  // exists (e.g. the taxonomy import) — it expires in about four hours and is
  // never refreshed, so using it in preference to a working refresh token would
  // fail every request past that window for no reason.
  if (getDropboxEnv().DROPBOX_REFRESH_TOKEN) {
    if (serverToken && serverToken.expiresAt.getTime() - EXPIRY_MARGIN_MS > Date.now()) {
      return serverToken.accessToken;
    }
    serverToken = await requestToken();
    return serverToken.accessToken;
  }

  const pasted = getDropboxEnv().DROPBOX_ACCESS_TOKEN;
  if (pasted) return pasted;

  throw new ConfigurationError(
    'Dropbox',
    'getServerAccessToken called with neither DROPBOX_REFRESH_TOKEN nor DROPBOX_ACCESS_TOKEN set',
    'Dropbox has not been connected yet. An administrator needs to run `npm run dropbox:connect`.',
  );
}

/**
 * A write-only token for one browser upload.
 *
 * Deliberately NOT memoized: a fresh token per upload keeps the credential's
 * useful life as short as Dropbox allows. Dropbox fixes short-lived tokens at
 * roughly four hours and the TTL cannot be shortened, so per-upload minting is
 * the only lever available.
 */
export async function mintBrowserUploadToken(): Promise<MintedToken> {
  // Deliberately NOT falling back to a pasted access token here.
  //
  // That token carries every scope the app was granted. Handing it to a browser
  // would widen what a leaked credential reaches from "write files" to
  // "everything this app can do" — the exact property Constitution IV exists to
  // protect. Refusing is the honest failure.
  if (!getDropboxEnv().DROPBOX_REFRESH_TOKEN) {
    // A ConfigurationError, NOT a StorageUnavailableError. Dropbox is perfectly
    // reachable; what is missing is a credential. Reporting this as a transport
    // failure would tell the reader to "try again" for something retrying can
    // never fix.
    throw new ConfigurationError(
      'Dropbox uploads',
      'mintBrowserUploadToken called without DROPBOX_REFRESH_TOKEN',
      'Uploading needs Dropbox to be connected properly. The browser is handed a write-only credential minted for each upload, and only a refresh token can produce one — a pasted access token carries every permission the app has, so it is deliberately not used here. An administrator needs to run `npm run dropbox:connect`.',
    );
  }
  return requestToken(BROWSER_UPLOAD_SCOPE);
}

/** Test-only: drops the memoized server token. */
export function resetTokenCache(): void {
  serverToken = undefined;
}
