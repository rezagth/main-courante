import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prisma, withTenantContext } from '@/lib/prisma';

export async function GET() {
  const user = await requirePermission('ENTRY:READ');
  const data = await withTenantContext(user.tenantId, async () =>
    prisma.typeEvenement.findMany({
      where: { isActive: true },
      select: { id: true, code: true, label: true },
      orderBy: { label: 'asc' },
    }),
  );
  return NextResponse.json({ data });
}
