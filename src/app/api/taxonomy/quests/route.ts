import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { LEVELS, createEntry } from '@/lib/taxonomy/crud';
import { ApiError, withErrorHandling } from '@/lib/http/errors';
import { listQuests } from '@/lib/db/queries/taxonomy';
import { idSchema, questCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * GET /api/taxonomy/quests?approvalStatusId=…
 *
 * Quests belong to one Approval Status, so the parent is required. This is what
 * makes the upload form's cascade a server-side fact (FR-011).
 */
export const GET = withErrorHandling(async (request: Request) => {
  await requireUser();

  const raw = new URL(request.url).searchParams.get('approvalStatusId');
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('validation_failed', 'Choose an approval status first.');
  }

  const quests = await listQuests(parsed.data, { activeOnly: true });
  return NextResponse.json({
    items: quests.map((quest) => ({ id: quest.id, name: quest.name })),
  });
});

/** POST — Admin only. Creating an entry requires naming its parent. */
export const POST = withErrorHandling(async (request: Request) => {
  const input = questCreateSchema.parse(await request.json());
  return createEntry(LEVELS.quests, {
    parentId: input.approvalStatusId,
    name: input.name,
    dropboxPath: input.dropboxPath,
    dropboxUrl: input.dropboxUrl,
  });
});
