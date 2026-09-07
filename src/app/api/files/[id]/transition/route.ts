import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/http/errors';
import { transitionFile } from '@/lib/workflow/execute';
import { idSchema, transitionSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * POST /api/files/[id]/transition — Admin only (FR-033).
 *
 * `expectedCurrentStatusId` is mandatory: it is how two Admins acting at once
 * are detected, so the second is told rather than silently overwriting the
 * first (FR-041).
 */
export const POST = withErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const fileId = idSchema.parse(id);
    const input = transitionSchema.parse(await request.json());

    const result = await transitionFile(admin.id, fileId, input);

    return NextResponse.json({
      file: {
        id: result.file.id,
        standardName: result.file.standardName,
        approvalStatusId: result.file.approvalStatusId,
        folderPath: result.file.dropboxFolderPath,
      },
      transition: {
        from: result.fromStatusName,
        to: result.toStatusName,
        createdFolders: result.createdTaxonomy,
      },
    });
  },
);
