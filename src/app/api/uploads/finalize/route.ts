import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/http/errors';
import { finalizeBatch } from '@/lib/uploads/finalize';
import { finalizeBatchSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * POST /api/uploads/finalize
 *
 * Marks the files that landed when a sibling failed, or clears the mark once
 * the set is complete or the uploader dismisses it (FR-027, FR-029).
 *
 * `complete: false` marks; `complete: true` clears.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = finalizeBatchSchema.parse(await request.json());
  const result = await finalizeBatch(user, input);

  return NextResponse.json(result);
});
