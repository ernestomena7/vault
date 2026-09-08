import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ConfigurationError } from '@/lib/config/env';
import {
  DestinationOccupiedError,
  InvalidPathError,
  NotFoundError,
  StorageUnavailableError,
} from '@/lib/storage/port';

/**
 * The single error envelope every route returns:
 *   { error: { code, message } }
 *
 * Messages are user-facing and English-only (FR-044). Codes are machine-facing
 * and stable — the interface branches on the code, never on the message text.
 *
 * See specs/001-dropbox-upload-approval/contracts/api.md
 */

export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'duplicate_name'
  | 'destination_occupied'
  | 'stale_status'
  | 'illegal_transition'
  | 'invalid_taxonomy_chain'
  | 'unsupported_file_type'
  | 'invalid_folder_segment'
  | 'in_use'
  | 'last_admin'
  | 'already_confirmed'
  | 'unknown_upload'
  | 'verification_failed'
  | 'validation_failed'
  | 'storage_unavailable'
  | 'not_configured'
  | 'internal_error';

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  duplicate_name: 409,
  destination_occupied: 409,
  stale_status: 409,
  illegal_transition: 422,
  invalid_taxonomy_chain: 422,
  unsupported_file_type: 422,
  invalid_folder_segment: 422,
  in_use: 409,
  last_admin: 409,
  already_confirmed: 409,
  unknown_upload: 404,
  verification_failed: 422,
  validation_failed: 422,
  storage_unavailable: 502,
  // 503, not 500: the deployment is incomplete, not broken.
  not_configured: 503,
  internal_error: 500,
};

/** A failure with a known shape, safe to show a user. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get status(): number {
    return STATUS[this.code];
  }
}

export const unauthenticated = () =>
  new ApiError('unauthenticated', 'Sign in to continue.');

export const forbidden = () =>
  new ApiError('forbidden', 'You do not have permission to do that.');

export const notFound = (what = 'That') =>
  new ApiError('not_found', `${what} could not be found.`);

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, unknown> };
}

export function errorResponse(error: unknown): NextResponse<ErrorBody> {
  const api = toApiError(error);
  return NextResponse.json<ErrorBody>(
    {
      error: {
        code: api.code,
        message: api.message,
        ...(api.details ? { details: api.details } : {}),
      },
    },
    { status: api.status },
  );
}

/**
 * Maps every known failure onto the envelope. Storage errors arrive here as the
 * port's four types — no route needs to know a Dropbox error shape.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    return new ApiError('validation_failed', 'Some of the details you provided are not valid.', {
      issues: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error instanceof InvalidPathError) {
    return new ApiError('invalid_folder_segment', error.message, { segment: error.segment });
  }

  if (error instanceof DestinationOccupiedError) {
    return new ApiError(
      'destination_occupied',
      'A different file already occupies that name at the destination. Nothing was moved.',
      { path: error.path },
    );
  }

  if (error instanceof NotFoundError) {
    return new ApiError('not_found', 'That file could not be found in Dropbox.', {
      path: error.path,
    });
  }

  if (error instanceof ConfigurationError) {
    // Deliberately NOT "please try again". Retrying cannot supply a missing
    // credential, and saying so sends the reader down a dead end instead of to
    // the person who can actually fix it.
    return new ApiError(
      'not_configured',
      error.userMessage ??
        `${error.area} has not been set up for this deployment yet, so this cannot work until an administrator finishes the configuration.`,
      { area: error.area },
    );
  }

  if (error instanceof StorageUnavailableError) {
    // The client only ever sees the generic message below (Constitution IV) —
    // but the real cause (error.message carries the Dropbox-side detail;
    // error.cause carries the original SDK error) is worth having in the
    // server log, or every storage_unavailable is a black box in production.
    console.error('Dropbox request failed:', error.message, error.cause ?? '');
    return new ApiError(
      'storage_unavailable',
      'Dropbox could not be reached. Nothing was changed, so you can try again.',
      error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : undefined,
    );
  }

  // Anything unrecognised is logged server-side and generalised for the user —
  // internal details never leak into a response (Constitution IV).
  console.error('Unhandled route error:', error);
  return new ApiError('internal_error', 'Something went wrong. Please try again.');
}

/** Wraps a route handler so every throw becomes the standard envelope. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
