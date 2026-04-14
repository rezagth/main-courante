import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

const schema = z.object({
  tenantId: z.uuid(),
  before: z.iso.datetime(),
  confirm: z.literal('CONFIRM_PURGE'),
});

export async function DELETE(request: Request) {
  await requireAnyRole(['SUPER_ADMIN']);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { tenantId, before } = parsed.data;
  const res = await prismaAdmin.archivedEntry.deleteMany({
    where: { tenantId, archivedAt: { lt: new Date(before) } },
  });
  return NextResponse.json({ deleted: res.count });
}
