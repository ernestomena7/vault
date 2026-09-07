import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { ApiError, withErrorHandling } from '@/lib/http/errors';
import { getFileById } from '@/lib/db/queries/files';
import { getStorage } from '@/lib/storage';
import { idSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * GET /api/files/[id]/link
 *
 * A time-limited link, never a permanent public URL and never a credential
 * (FR-043, Constitution IV). An Uploader can only get a link to their own file.
 */
export const GET = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await context.params;
    const fileId = idSchema.parse(id);

    const file = await getFileById(fileId, {
      ...(user.role === 'admin' ? {} : { restrictToUploaderId: user.id }),
    });
    if (!file) throw new ApiError('not_found', 'That file could not be found.');

    const storage = await getStorage();
    const link = await storage.createTemporaryLink(file.dropboxFolderPath, file.standardName);

    return NextResponse.json({
      url: link.url,
      expiresAt: link.expiresAt.toISOString(),
    });
  },
);
