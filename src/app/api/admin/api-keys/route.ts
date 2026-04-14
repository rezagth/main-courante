import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

const createSchema = z.object({
  tenantId: z.uuid(),
  label: z.string().min(2),
});

function hashKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export async function POST(request: Request) {
  await requireAnyRole(['SUPER_ADMIN']);
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const rawKey = `mc_${randomBytes(24).toString('hex')}`;
  const key = await prismaAdmin.tenantApiKey.create({
    data: {
      tenantId: parsed.data.tenantId,
      label: parsed.data.label,
      keyHash: hashKey(rawKey),
    },
  });
  return NextResponse.json({ data: key, plainTextKey: rawKey });
}

export async function GET(request: Request) {
  await requireAnyRole(['SUPER_ADMIN']);
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const rows = await prismaAdmin.tenantApiKey.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { createdAt: 'desc' },
    select: { id: true, tenantId: true, label: true, isActive: true, lastUsedAt: true, createdAt: true },
  });
  return NextResponse.json({ data: rows });
}
