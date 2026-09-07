import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { ApiError, withErrorHandling } from '@/lib/http/errors';
import { userCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Password hashes never leave the server, not even to an Admin. */
const publicColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const rows = await db.select(publicColumns).from(users).orderBy(asc(users.name));
  return NextResponse.json({ items: rows });
});

export const POST = withErrorHandling(async (request: Request) => {
  await requireAdmin();
  const input = userCreateSchema.parse(await request.json());

  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing[0]) {
    throw new ApiError('duplicate_name', 'An account with that email already exists.');
  }

  const [inserted] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name.trim(),
      role: input.role,
      passwordHash: await hashPassword(input.password),
      isActive: true,
    })
    .$returningId();

  const created = await db.select(publicColumns).from(users).where(eq(users.id, inserted!.id)).limit(1);
  return NextResponse.json(created[0], { status: 201 });
});
