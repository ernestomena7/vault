import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/http/errors';
import { listFiles } from '@/lib/db/queries/files';
import { fileListQuerySchema } from '@/lib/validation';
import { allowedTransitionsFor } from '@/lib/workflow/transitions';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';

export const runtime = 'nodejs';

/**
 * GET /api/files
 *
 * An Admin sees everything; an Uploader sees only their own uploads. The scope
 * is decided from the session, never from the query string, so an Uploader
 * cannot widen it by asking.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const query = fileListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  const { items, total } = await listFiles({
    ...query,
    ...(user.role === 'admin' ? {} : { restrictToUploaderId: user.id }),
  });

  // Admins also get the moves each file may legally make, so the interface
  // never has to guess (FR-035).
  const statuses = user.role === 'admin' ? await listApprovalStatuses() : [];

  return NextResponse.json({
    items: items.map((file) => ({
      ...file,
      uploadedAt: file.uploadedAt.toISOString(),
      ...(user.role === 'admin'
        ? {
            allowedTransitions: allowedTransitionsFor(file.approvalStatusPosition, statuses).map(
              (status) => ({ id: status.id, name: status.name, position: status.position }),
            ),
          }
        : {}),
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
  });
});
