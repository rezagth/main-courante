import { NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

export async function PATCH(request: Request) {
  await requireAnyRole(['SUPER_ADMIN']);
  const body = (await request.json()) as { tenantId?: string; key?: string; enabled?: boolean };
  if (!body.tenantId || !body.key || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'tenantId, key and enabled are required' }, { status: 400 });
  }

  const flag = await prismaAdmin.tenantFeatureFlag.upsert({
    where: {
      tenantId_key: { tenantId: body.tenantId, key: body.key },
    },
    create: {
      tenantId: body.tenantId,
      key: body.key,
      enabled: body.enabled,
    },
    update: { enabled: body.enabled },
  });

  return NextResponse.json({ data: flag });
}
