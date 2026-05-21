import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';

const createLocationSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const user = await requirePermission('SITE:MANAGE');
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');

  const locations = await prismaAdmin.location.findMany({
    where: {
      tenantId: user.tenantId,
      ...(siteId ? { siteId } : {}),
    },
    select: {
      id: true,
      siteId: true,
      name: true,
      code: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ siteId: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ locations });
}

export async function POST(request: Request) {
  const user = await requirePermission('SITE:MANAGE');
  const parsed = createLocationSchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .join('; ') || 'Validation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = parsed.data;
  const site = await prismaAdmin.site.findFirst({
    where: { id: payload.siteId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!site) {
    return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
  }

  const duplicate = await prismaAdmin.location.findFirst({
    where: {
      tenantId: user.tenantId,
      siteId: payload.siteId,
      code: payload.code,
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json({ error: 'Code endroit déjà utilisé pour cet hôpital' }, { status: 409 });
  }

  const location = await prismaAdmin.location.create({
    data: {
      tenantId: user.tenantId,
      siteId: payload.siteId,
      name: payload.name,
      code: payload.code,
      isActive: payload.isActive ?? true,
    },
    select: {
      id: true,
      siteId: true,
      name: true,
      code: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ location }, { status: 201 });
}
