import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '@/lib/config/env';
import { toApiError } from '@/lib/http/errors';

/**
 * Missing configuration must never be reported as a transient failure.
 *
 * This was a real defect found in testing: an uploader queued ten files, filled
 * in every stage, pressed upload, and was told "Something went wrong. Please
 * try again" — for a missing Dropbox credential that no amount of retrying
 * could supply. The message sent them down a dead end instead of to the person
 * who could actually fix it.
 */
describe('configuration errors', () => {
  const error = toApiError(
    new ConfigurationError('Dropbox', 'Dropbox is not configured:\n  - DROPBOX_REFRESH_TOKEN'),
  );

  it('is a 503, not a 500 — the deployment is incomplete, not broken', () => {
    expect(error.code).toBe('not_configured');
    expect(error.status).toBe(503);
  });

  it('never tells the reader to try again', () => {
    expect(error.message.toLowerCase()).not.toContain('try again');
  });

  it('names what is unconfigured, so the reader knows who to ask', () => {
    expect(error.message).toContain('Dropbox');
    expect(error.details?.area).toBe('Dropbox');
  });

  it('does not leak the variable names or the internal hint', () => {
    // The server log carries the detail; a user-facing message must not
    // (Constitution IV).
    expect(error.message).not.toContain('DROPBOX_REFRESH_TOKEN');
    expect(error.message).not.toContain('.env');
  });

  it('shows a caller-supplied message when there is something specific to say', () => {
    // Found in testing: the refresh-token guard wrote a precise, actionable
    // message and toApiError silently replaced it with generic wording, so the
    // reader was told "could not be reached, try again" about a credential
    // problem while Dropbox was answering perfectly.
    const specific = toApiError(
      new ConfigurationError('Dropbox uploads', 'internal detail', 'Run `npm run dropbox:connect`.'),
    );

    expect(specific.message).toBe('Run `npm run dropbox:connect`.');
    expect(specific.code).toBe('not_configured');
    // The internal wording stays internal.
    expect(specific.message).not.toContain('internal detail');
  });

  it('still generalises a genuinely unexpected error', () => {
    const unknown = toApiError(new Error('kaboom'));
    expect(unknown.code).toBe('internal_error');
    expect(unknown.status).toBe(500);
    // An unknown failure MIGHT be transient, so retrying is fair advice there.
    expect(unknown.message).toContain('try again');
  });
});

describe('who is allowed to upload', () => {
  /**
   * Two different questions that were once one, and conflating them let an
   * uploader queue ten files before being told uploading was impossible.
   *
   * `isDropboxConfigured` — can the server talk to Dropbox at all?
   * `canUpload`           — can the browser be handed a credential?
   *
   * A pasted access token answers yes to the first and no to the second: it
   * carries every permission the app has, so it cannot be narrowed to the
   * write-only credential an upload requires (Constitution IV).
   */
  const BASE = {
    DROPBOX_APP_KEY: 'key',
    DROPBOX_APP_SECRET: 'secret',
    DROPBOX_ROOT_PATH: '',
    DROPBOX_PATH_ROOT_NAMESPACE_ID: '',
    UPLOAD_CHUNK_SIZE_BYTES: '8388608',
  };

  function withEnv(overrides: Record<string, string>, run: () => void) {
    const saved = { ...process.env };
    Object.assign(process.env, BASE, overrides);
    try {
      run();
    } finally {
      process.env = saved;
    }
  }

  it('an access token alone is enough to browse but not to upload', async () => {
    const { isDropboxConfigured, canUpload } = await import('@/lib/config/env');
    withEnv({ DROPBOX_ACCESS_TOKEN: 'sl.abc', DROPBOX_REFRESH_TOKEN: '' }, () => {
      expect(isDropboxConfigured()).toBe(true);
      expect(canUpload()).toBe(false);
    });
  });

  it('a refresh token is enough for both', async () => {
    const { isDropboxConfigured, canUpload } = await import('@/lib/config/env');
    withEnv({ DROPBOX_ACCESS_TOKEN: '', DROPBOX_REFRESH_TOKEN: 'rt.abc' }, () => {
      expect(isDropboxConfigured()).toBe(true);
      expect(canUpload()).toBe(true);
    });
  });

  it('neither credential means neither is possible', async () => {
    const { isDropboxConfigured, canUpload } = await import('@/lib/config/env');
    withEnv({ DROPBOX_ACCESS_TOKEN: '', DROPBOX_REFRESH_TOKEN: '' }, () => {
      expect(isDropboxConfigured()).toBe(false);
      expect(canUpload()).toBe(false);
    });
  });
});
