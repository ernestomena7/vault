import { NextResponse } from 'next/server';
import { requireAdmin, requireUser } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/http/errors';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';
import { db } from '@/lib/db/client';
import { approvalStatuses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ApiError } from '@/lib/http/errors';
import { normalizeName } from '@/lib/naming';
import { assertValidFolderPath, nextStatusPosition } from '@/lib/taxonomy/lifecycle';
import { approvalStatusCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * GET /api/taxonomy/statuses
 *
 * Feeds the first menu of the upload form. Readable by any signed-in user;
 * writes live in User Story 4 and are Admin-only.
 */
export const GET = withErrorHandling(async () => {
  await requireUser();
  const statuses = await listApprovalStatuses({ activeOnly: true });

  return NextResponse.json({
    items: statuses.map((status) => ({
      id: status.id,
      name: status.name,
      position: status.position,
    })),
  });
});

/**
 * POST — Admin only. A new status goes to the end of the workflow; an Admin
 * moves it with the reorder endpoint (FR-023).
 */
export const POST = withErrorHandling(async (request: Request) => {
  await requireAdmin();
  const input = approvalStatusCreateSchema.parse(await request.json());

  const existing = await db.select().from(approvalStatuses);
  if (existing.some((row) => normalizeName(row.name) === normalizeName(input.name))) {
    throw new ApiError('duplicate_name', `There is already a status called "${input.name.trim()}".`);
  }

  const [inserted] = await db
    .insert(approvalStatuses)
    .values({
      name: input.name.trim(),
      dropboxPath: assertValidFolderPath(input.dropboxPath),
      ...(input.dropboxUrl ? { dropboxUrl: input.dropboxUrl } : {}),
      position: await nextStatusPosition(),
    })
    .$returningId();

  const created = await db
    .select()
    .from(approvalStatuses)
    .where(eq(approvalStatuses.id, inserted!.id))
    .limit(1);

  return NextResponse.json(created[0], { status: 201 });
});
