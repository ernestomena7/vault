import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/http/errors';
import { reorderStatuses } from '@/lib/taxonomy/lifecycle';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';
import { reorderSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * POST /api/taxonomy/statuses/reorder
 *
 * Rewrites the workflow order in one transaction, leaving positions contiguous
 * (FR-024). Because transition legality is derived from position, the permitted
 * moves for every existing file change the moment this returns — no migration,
 * nothing to keep in sync.
 */
export const POST = withErrorHandling(async (request: Request) => {
  await requireAdmin();
  const { orderedIds } = reorderSchema.parse(await request.json());

  await reorderStatuses(orderedIds);

  const statuses = await listApprovalStatuses();
  return NextResponse.json({
    items: statuses.map((s) => ({ id: s.id, name: s.name, position: s.position })),
  });
});
