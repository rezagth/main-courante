import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/authorization';
import { cachedJson } from '@/lib/cache';

export async function GET() {
  await requireAnyRole(['PATRON', 'SUPER_ADMIN']);

  const payload = await cachedJson('analytics:patron:global:30d', async () => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      tenants,
      usersCount,
      sitesCount,
      teamsCount,
      entriesLast30Days,
      entriesByTenant,
      recentEntries,
    ] = await Promise.all([
      prismaAdmin.tenant.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          _count: {
            select: {
              users: true,
              sites: true,
              teams: true,
            },
          },
        },
      }),
      prismaAdmin.user.count({ where: { isActive: true } }),
      prismaAdmin.site.count({ where: { isActive: true } }),
      prismaAdmin.team.count({ where: { isActive: true } }),
      prismaAdmin.entreeMainCourante.count({
        where: {
          deletedAt: null,
          timestamp: { gte: from },
        },
      }),
      prismaAdmin.entreeMainCourante.groupBy({
        by: ['tenantId'],
        where: {
          deletedAt: null,
          timestamp: { gte: from },
        },
        _count: { _all: true },
      }),
      prismaAdmin.entreeMainCourante.findMany({
        where: { deletedAt: null },
        orderBy: { timestamp: 'desc' },
        take: 12,
        include: {
          tenant: { select: { name: true } },
          site: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
          typeEvenement: { select: { label: true } },
        },
      }),
    ]);

    const entriesByTenantMap = Object.fromEntries(
      entriesByTenant.map((item) => [item.tenantId, item._count._all]),
    );

    return {
      totals: {
        tenants: await prismaAdmin.tenant.count(),
        users: usersCount,
        sites: sitesCount,
        teams: teamsCount,
        entriesLast30Days,
      },
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
        users: tenant._count.users,
        sites: tenant._count.sites,
        teams: tenant._count.teams,
        entriesLast30Days: entriesByTenantMap[tenant.id] ?? 0,
      })),
      recentEntries: recentEntries.map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        tenantName: entry.tenant.name,
        siteName: entry.site.name,
        agentName: `${entry.user.firstName} ${entry.user.lastName}`.trim(),
        typeLabel: entry.typeEvenement.label,
        gravite: entry.gravite,
        description: entry.description,
      })),
    };
  });

  return NextResponse.json(payload);
}
