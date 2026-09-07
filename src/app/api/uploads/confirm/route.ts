import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/http/errors';
import { confirmUpload } from '@/lib/uploads/confirm';
import { confirmUploadSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * POST /api/uploads/confirm
 *
 * Verifies with Dropbox before recording anything. The body carries a handle
 * and a claim; neither is trusted (FR-020).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = confirmUploadSchema.parse(await request.json());
  const file = await confirmUpload(user.id, input);

  return NextResponse.json(
    {
      id: file.id,
      standardName: file.standardName,
      distinguishingText: file.distinguishingText,
      folderPath: file.dropboxFolderPath,
      approvalStatusId: file.approvalStatusId,
      sizeBytes: file.sizeBytes,
      uploadedAt: file.uploadedAt.toISOString(),
    },
    { status: 201 },
  );
});
