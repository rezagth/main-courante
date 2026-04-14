import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

const updateSchema = z.object({
  tenantId: z.uuid(),
  maxActiveUsers: z.number().int().min(1).optional(),
  maxEntriesPerMonth: z.number().int().min(1).optional(),
  maxStorageGb: z.number().int().min(1).optional(),
});

export async function GET() {
  await requireAnyRole(['SUPER_ADMIN']);
  const rows = await prismaAdmin.tenant.findMany({
    select: {
      id: true,
      name: true,
      quotas: true,
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ data: rows });
}

export async function PATCH(request: Request) {
  await requireAnyRole(['SUPER_ADMIN']);
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { tenantId, ...values } = parsed.data;
  const quota = await prismaAdmin.tenantQuota.upsert({
    where: { tenantId },
    create: { tenantId, ...values },
    update: values,
  });
  return NextResponse.json({ data: quota });
}
