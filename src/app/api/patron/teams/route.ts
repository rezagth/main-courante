import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';

const createTeamSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const user = await requirePermission('SITE:MANAGE');
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');

  const teams = await prismaAdmin.team.findMany({
    where: {
      tenantId: user.tenantId,
      ...(siteId ? { siteId } : {}),
    },
    orderBy: [{ siteId: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      siteId: true,
      name: true,
      code: true,
      isActive: true,
    },
  });

  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  const user = await requirePermission('SITE:MANAGE');
  const parsed = createTeamSchema.safeParse(await request.json());
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

  const duplicate = await prismaAdmin.team.findFirst({
    where: {
      tenantId: user.tenantId,
      siteId: payload.siteId,
      code: payload.code,
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json({ error: 'Code équipe déjà utilisé pour cet hôpital' }, { status: 409 });
  }

  const team = await prismaAdmin.team.create({
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
    },
  });

  return NextResponse.json({ team }, { status: 201 });
}
