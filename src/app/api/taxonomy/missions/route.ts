import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { LEVELS, createEntry } from '@/lib/taxonomy/crud';
import { ApiError, withErrorHandling } from '@/lib/http/errors';
import { listMissions } from '@/lib/db/queries/taxonomy';
import { idSchema, missionCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** GET /api/taxonomy/missions?questId=… — Missions belong to one Quest. */
export const GET = withErrorHandling(async (request: Request) => {
  await requireUser();

  const parsed = idSchema.safeParse(new URL(request.url).searchParams.get('questId'));
  if (!parsed.success) {
    throw new ApiError('validation_failed', 'Choose a quest first.');
  }

  const missions = await listMissions(parsed.data, { activeOnly: true });
  return NextResponse.json({
    items: missions.map((mission) => ({ id: mission.id, name: mission.name })),
  });
});

/** POST — Admin only. Creating an entry requires naming its parent. */
export const POST = withErrorHandling(async (request: Request) => {
  const input = missionCreateSchema.parse(await request.json());
  return createEntry(LEVELS.missions, {
    parentId: input.questId,
    name: input.name,
    dropboxPath: input.dropboxPath,
    dropboxUrl: input.dropboxUrl,
  });
});
