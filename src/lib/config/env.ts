import 'server-only';
import { z } from 'zod';

/**
 * Environment configuration.
 *
 * Every host-specific value comes from the environment — nothing is hardcoded
 * in source (Constitution III). Values are validated at the point of use and
 * the app refuses to proceed on a missing one.
 *
 * Validation is grouped by concern rather than done all at once, and that
 * matters: a single all-or-nothing check meant a missing Dropbox token stopped
 * people signing in, which has nothing to do with Dropbox. Fail-fast should
 * stop the thing that actually needs the missing value, and say so — not take
 * unrelated features down with it.
 *
 * This module is server-only. Nothing here may ever reach the browser
 * (Constitution IV).
 */

const HINT = 'Copy .env.example to .env.local and fill it in.';

/**
 * Something the deployment has not been configured with yet.
 *
 * A distinct type because it must never reach a user as "something went
 * wrong, please try again". Missing configuration is not transient: retrying
 * cannot fix it, and saying otherwise wastes the reader's time and hides the
 * real problem. `toApiError` maps this to its own code and message.
 */
export class ConfigurationError extends Error {
  constructor(
    readonly area: string,
    message: string,
    /**
     * Shown to the user instead of the generic wording. Set it when the caller
     * knows something specific and actionable — a generic message wastes the
     * one chance to tell somebody what to actually do.
     */
    readonly userMessage?: string,
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function parse<T extends z.ZodType>(schema: T, area: string, hint = HINT): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new ConfigurationError(
      area,
      `${area} is not configured:\n${problems}\n\n${hint}`,
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

let databaseEnv: z.infer<typeof databaseSchema> | undefined;

export function getDatabaseEnv() {
  databaseEnv ??= parse(
    databaseSchema,
    'The database',
    'Start one with `docker compose up -d`, then set DATABASE_URL in .env.local.',
  );
  return databaseEnv;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

const authSchema = z.object({
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.url('AUTH_URL must be a valid URL'),
});

let authEnv: z.infer<typeof authSchema> | undefined;

export function getAuthEnv() {
  authEnv ??= parse(
    authSchema,
    'Authentication',
    'Generate a secret with `openssl rand -base64 32` and set it in .env.local.',
  );
  return authEnv;
}

// ---------------------------------------------------------------------------
// Dropbox
// ---------------------------------------------------------------------------

const dropboxSchema = z.object({
  DROPBOX_APP_KEY: z.string().min(1, 'DROPBOX_APP_KEY is required'),
  DROPBOX_APP_SECRET: z.string().min(1, 'DROPBOX_APP_SECRET is required'),
  /**
   * The long-term credential. Preferred, and required for uploads: only a
   * refresh token can mint the reduced-scope, per-batch token the browser
   * holds (Constitution IV).
   */
  DROPBOX_REFRESH_TOKEN: z.string().default(''),

  /**
   * A short-lived access token pasted straight from the App Console.
   *
   * An escape hatch for one-off server-side work — reading a folder tree, say —
   * before the OAuth flow has been done. Dropbox expires these in about four
   * hours, so an app running on one will simply stop working; it is not a
   * substitute for the refresh token.
   */
  DROPBOX_ACCESS_TOKEN: z.string().default(''),

  /**
   * The folder every Vault path is relative to.
   *
   * Empty for an App-folder app, where Dropbox already scopes paths to the app
   * folder. For a Full Dropbox app, set it to the folder that holds the
   * approval-status folders, e.g. "/Mission Quest Academy/App Vault Folder".
   */
  DROPBOX_ROOT_PATH: z.string().default(''),

  /**
   * Team-space namespace id, for a Dropbox Business account whose content lives
   * in the team space rather than the signed-in member's personal folder.
   *
   * The API defaults to the member's HOME namespace, so without this every path
   * into a team folder resolves to nothing. `who_am_i` reports it as
   * `root_namespace_id`; leave empty when that matches `home_namespace_id`,
   * which is the case for a personal account.
   */
  DROPBOX_PATH_ROOT_NAMESPACE_ID: z.string().default(''),

  UPLOAD_CHUNK_SIZE_BYTES: z.coerce
    .number()
    .int()
    .min(1024 * 1024, 'Chunks below 1 MiB create needless request volume')
    .max(140 * 1024 * 1024, 'Dropbox rejects an append larger than 150 MB')
    .default(8 * 1024 * 1024),
})
  .refine(
    (env) => Boolean(env.DROPBOX_REFRESH_TOKEN || env.DROPBOX_ACCESS_TOKEN),
    {
      path: ['DROPBOX_REFRESH_TOKEN'],
      message:
        'either DROPBOX_REFRESH_TOKEN (run `npm run dropbox:connect`) or, for one-off server work, DROPBOX_ACCESS_TOKEN',
    },
  );

let dropboxEnv: z.infer<typeof dropboxSchema> | undefined;

/**
 * Throws only when something actually reaches for Dropbox — an upload, a move,
 * a link. Browsing, signing in and administration all work without it, which is
 * what lets the app be set up in a sensible order.
 */
export function getDropboxEnv() {
  dropboxEnv ??= parse(
    dropboxSchema,
    'Dropbox',
    'Register an app (Scoped access, App folder), submit its scopes, then obtain a refresh token — see specs/001-dropbox-upload-approval/quickstart.md.',
  );
  return dropboxEnv;
}

/**
 * True when Dropbox is configured well enough for server-side work — reading a
 * folder tree, moving a file. Either credential will do. Never throws.
 */
export function isDropboxConfigured(): boolean {
  return dropboxSchema.safeParse(process.env).success;
}

/**
 * True when UPLOADS can work, which is a stricter question.
 *
 * An upload hands the browser a credential, and only a refresh token can mint
 * one narrow enough to hand over (Constitution IV). A pasted access token
 * satisfies `isDropboxConfigured` but cannot do this — so asking the looser
 * question here would let somebody queue twenty files and fill in every stage
 * before hitting a wall.
 */
export function canUpload(): boolean {
  const parsed = dropboxSchema.safeParse(process.env);
  return parsed.success && Boolean(parsed.data.DROPBOX_REFRESH_TOKEN);
}

/** Test-only: clears every memoized group. */
export function resetEnvCache(): void {
  databaseEnv = undefined;
  authEnv = undefined;
  dropboxEnv = undefined;
}
