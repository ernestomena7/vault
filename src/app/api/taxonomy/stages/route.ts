import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { LEVELS, createEntry } from '@/lib/taxonomy/crud';
import { ApiError, withErrorHandling } from '@/lib/http/errors';
import { listStages } from '@/lib/db/queries/taxonomy';
import { idSchema, stageCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** GET /api/taxonomy/stages?missionId=… — Stages belong to one Mission. */
export const GET = withErrorHandling(async (request: Request) => {
  await requireUser();

  const parsed = idSchema.safeParse(new URL(request.url).searchParams.get('missionId'));
  if (!parsed.success) {
    throw new ApiError('validation_failed', 'Choose a mission first.');
  }

  const stages = await listStages(parsed.data, { activeOnly: true });
  return NextResponse.json({
    items: stages.map((stage) => ({ id: stage.id, name: stage.name })),
  });
});

/** POST — Admin only. Creating an entry requires naming its parent. */
export const POST = withErrorHandling(async (request: Request) => {
  const input = stageCreateSchema.parse(await request.json());
  return createEntry(LEVELS.stages, {
    parentId: input.missionId,
    name: input.name,
    
    
  });
});
