import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

export async function GET() {
  const user = await requirePermission('ENTRY:READ');
  const data = await prismaAdmin.typeEvenement.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    select: { id: true, code: true, label: true },
    orderBy: { label: 'asc' },
  });
  return NextResponse.json({ data });
}
