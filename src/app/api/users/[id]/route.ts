import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/guards';
import { assertUserDeletable, withLastAdminGuard } from '@/lib/auth/admin-guard';
import { hashPassword } from '@/lib/auth/password';
import { ApiError, withErrorHandling } from '@/lib/http/errors';
import { idSchema, userUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

const publicColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

export const PATCH = withErrorHandling(async (request: Request, context: Context) => {
  await requireAdmin();
  const { id: raw } = await context.params;
  const id = idSchema.parse(raw);
  const input = userUpdateSchema.parse(await request.json());

  const values: Record<string, unknown> = {};
  if (input.name !== undefined) values.name = input.name.trim();
  if (input.role !== undefined) values.role = input.role;
  if (input.isActive !== undefined) values.isActive = input.isActive;
  if (input.password !== undefined) values.passwordHash = await hashPassword(input.password);

  // A demotion or deactivation of the last admin is refused before it happens.
  const removesAdmin = input.role === 'uploader' || input.isActive === false;

  if (removesAdmin) {
    await withLastAdminGuard(id, input.isActive === false ? 'deactivate' : 'demote', async (tx) => {
      await tx.update(users).set(values as never).where(eq(users.id, id));
    });
  } else {
    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing[0]) throw new ApiError('not_found', 'That user could not be found.');
    await db.update(users).set(values as never).where(eq(users.id, id));
  }

  const updated = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return NextResponse.json(updated[0]);
});

export const DELETE = withErrorHandling(async (_request: Request, context: Context) => {
  await requireAdmin();
  const { id: raw } = await context.params;
  const id = idSchema.parse(raw);

  await assertUserDeletable(id);
  await withLastAdminGuard(id, 'delete', async (tx) => {
    await tx.delete(users).where(eq(users.id, id));
  });

  return NextResponse.json({ deleted: true, id });
});
