import { withErrorHandling } from '@/lib/http/errors';
import { LEVELS, deleteEntry, updateEntry } from '@/lib/taxonomy/crud';
import { idSchema, missionUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandling(async (request: Request, context: Context) => {
  const { id } = await context.params;
  return updateEntry(
    LEVELS.missions,
    idSchema.parse(id),
    missionUpdateSchema.parse(await request.json()),
  );
});

export const DELETE = withErrorHandling(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  return deleteEntry(LEVELS.missions, idSchema.parse(id));
});
