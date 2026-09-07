import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { approvalStatuses } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/guards';
import { ApiError, withErrorHandling } from '@/lib/http/errors';
import { normalizeName } from '@/lib/naming';
import { assertDeletable, assertValidFolderPath } from '@/lib/taxonomy/lifecycle';
import { approvalStatusUpdateSchema, idSchema } from '@/lib/validation';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandling(async (request: Request, context: Context) => {
  await requireAdmin();
  const { id: raw } = await context.params;
  const id = idSchema.parse(raw);
  const input = approvalStatusUpdateSchema.parse(await request.json());

  const existing = await db.select().from(approvalStatuses).where(eq(approvalStatuses.id, id)).limit(1);
  if (!existing[0]) throw new ApiError('not_found', 'That approval status could not be found.');

  if (input.name !== undefined) {
    const all = await db.select().from(approvalStatuses);
    if (all.some((row) => row.id !== id && normalizeName(row.name) === normalizeName(input.name!))) {
      throw new ApiError('duplicate_name', `There is already a status called "${input.name.trim()}".`);
    }
  }

  const values: Record<string, unknown> = {};
  if (input.name !== undefined) values.name = input.name.trim();
  if (input.dropboxPath !== undefined) values.dropboxPath = assertValidFolderPath(input.dropboxPath);
  if (input.dropboxUrl !== undefined) values.dropboxUrl = input.dropboxUrl;
  if (input.isActive !== undefined) values.isActive = input.isActive;

  // Forward-looking only: files already in this status keep their location
  // and name (FR-031).
  await db.update(approvalStatuses).set(values as never).where(eq(approvalStatuses.id, id));

  const updated = await db.select().from(approvalStatuses).where(eq(approvalStatuses.id, id)).limit(1);
  return NextResponse.json(updated[0]);
});

export const DELETE = withErrorHandling(async (_request: Request, context: Context) => {
  await requireAdmin();
  const { id: raw } = await context.params;
  const id = idSchema.parse(raw);

  const existing = await db.select().from(approvalStatuses).where(eq(approvalStatuses.id, id)).limit(1);
  if (!existing[0]) throw new ApiError('not_found', 'That approval status could not be found.');

  await assertDeletable('status', id);
  await db.delete(approvalStatuses).where(eq(approvalStatuses.id, id));

  return NextResponse.json({ deleted: true, id });
});
