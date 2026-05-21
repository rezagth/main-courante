import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('SITE:MANAGE');
  const { id } = await context.params;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prismaAdmin.location.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, siteId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Endroit introuvable' }, { status: 404 });
  }

  if (parsed.data.code) {
    const duplicate = await prismaAdmin.location.findFirst({
      where: {
        tenantId: user.tenantId,
        siteId: existing.siteId,
        code: parsed.data.code,
        NOT: { id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Code endroit déjà utilisé pour cet hôpital' }, { status: 409 });
    }
  }

  const location = await prismaAdmin.location.update({
    where: { id_tenantId: { id, tenantId: user.tenantId } },
    data: parsed.data,
    select: {
      id: true,
      siteId: true,
      name: true,
      code: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ location });
}
