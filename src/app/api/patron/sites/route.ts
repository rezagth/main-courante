import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { hasLocationAssignmentTables, isMissingTableError } from '@/lib/location-assignments-compat';

const createSiteSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const user = await requirePermission('SITE:MANAGE');
  const now = new Date();

  const [sites, teams, agents] = await Promise.all([
    prismaAdmin.site.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        isActive: true,
      },
    }),
    prismaAdmin.team.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ siteId: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        siteId: true,
        name: true,
        code: true,
        isActive: true,
      },
    }),
    prismaAdmin.user.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, siteId: true },
    }),
  ]);

  let locations: Array<{ id: string; siteId: string; name: string; code: string; isActive: boolean }> = [];
  let activeAssignments: Array<{ siteId: string; userId: string }> = [];

  if (await hasLocationAssignmentTables()) {
    try {
      [locations, activeAssignments] = await Promise.all([
        prismaAdmin.location.findMany({
          where: { tenantId: user.tenantId },
          orderBy: [{ siteId: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            siteId: true,
            name: true,
            code: true,
            isActive: true,
          },
        }),
        prismaAdmin.userLocationAssignment.findMany({
          where: {
            tenantId: user.tenantId,
            startedAt: { lte: now },
            OR: [{ endedAt: null }, { endedAt: { gte: now } }],
          },
          select: { siteId: true, userId: true },
        }),
      ]);
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }
    }
  }

  const teamsBySite = new Map<string, number>();
  for (const team of teams) {
    teamsBySite.set(team.siteId, (teamsBySite.get(team.siteId) ?? 0) + 1);
  }

  const agentsBySite = new Map<string, number>();
  if (activeAssignments.length > 0) {
    const uniqueBySiteUser = new Set(activeAssignments.map((item) => `${item.siteId}:${item.userId}`));
    for (const value of uniqueBySiteUser) {
      const [siteId] = value.split(':');
      agentsBySite.set(siteId, (agentsBySite.get(siteId) ?? 0) + 1);
    }
  } else {
    for (const agent of agents) {
      if (!agent.siteId) continue;
      agentsBySite.set(agent.siteId, (agentsBySite.get(agent.siteId) ?? 0) + 1);
    }
  }

  const locationsBySite = new Map<string, number>();
  for (const location of locations) {
    locationsBySite.set(location.siteId, (locationsBySite.get(location.siteId) ?? 0) + 1);
  }

  return NextResponse.json({
    sites: sites.map((site) => ({
      ...site,
      teamCount: teamsBySite.get(site.id) ?? 0,
      locationCount: locationsBySite.get(site.id) ?? 0,
      agentCount: agentsBySite.get(site.id) ?? 0,
    })),
    teams,
    locations,
  });
}

export async function POST(request: Request) {
  const user = await requirePermission('SITE:MANAGE');
  const parsed = createSiteSchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .join('; ') || 'Validation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = parsed.data;
  const existing = await prismaAdmin.site.findFirst({
    where: { tenantId: user.tenantId, code: payload.code },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: 'Code site déjà utilisé' }, { status: 409 });
  }

  const site = await prismaAdmin.site.create({
    data: {
      tenantId: user.tenantId,
      name: payload.name,
      code: payload.code,
      address: payload.address ?? null,
      isActive: payload.isActive ?? true,
    },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      isActive: true,
    },
  });

  return NextResponse.json({ site }, { status: 201 });
}
