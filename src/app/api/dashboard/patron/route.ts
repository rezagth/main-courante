import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/authorization';
import { cachedJson } from '@/lib/cache';

export async function GET() {
  const user = await requireAnyRole(['PATRON', 'SUPER_ADMIN']);
  const isSuper = (user.roles ?? []).includes('SUPER_ADMIN');

  const cacheKey = isSuper ? 'analytics:patron:global:30d' : `analytics:patron:tenant:${user.tenantId}:30d`;

  const payload = await cachedJson(cacheKey, async () => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const commonWhere: any = { deletedAt: null };
    if (!isSuper) commonWhere.tenantId = user.tenantId;

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
        where: isSuper ? undefined : { id: user.tenantId },
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
      prismaAdmin.user.count({ where: { ...(isSuper ? {} : { tenantId: user.tenantId }), isActive: true } }),
      prismaAdmin.site.count({ where: { ...(isSuper ? {} : { tenantId: user.tenantId }), isActive: true } }),
      prismaAdmin.team.count({ where: { ...(isSuper ? {} : { tenantId: user.tenantId }), isActive: true } }),
      prismaAdmin.entreeMainCourante.count({
        where: { ...commonWhere, timestamp: { gte: from } },
      }),
      prismaAdmin.entreeMainCourante.groupBy({
        by: ['tenantId'],
        where: { ...commonWhere, timestamp: { gte: from } },
        _count: { _all: true },
      }),
      prismaAdmin.entreeMainCourante.findMany({
        where: commonWhere,
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
        tenants: isSuper ? Number(await prismaAdmin.tenant.count()) : Number(tenants.length),
        users: Number(usersCount),
        sites: Number(sitesCount),
        teams: Number(teamsCount),
        entriesLast30Days: Number(entriesLast30Days),
      },
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
        users: Number(tenant._count.users ?? 0),
        sites: Number(tenant._count.sites ?? 0),
        teams: Number(tenant._count.teams ?? 0),
        entriesLast30Days: Number(entriesByTenantMap[tenant.id] ?? 0),
      })),
      recentEntries: recentEntries.map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp ? entry.timestamp.toISOString() : new Date().toISOString(),
        tenantName: entry.tenant?.name ?? '—',
        siteName: entry.site?.name ?? '—',
        agentName: `${entry.user?.firstName ?? ''} ${entry.user?.lastName ?? ''}`.trim() || 'Inconnu',
        typeLabel: entry.typeEvenement?.label ?? '—',
        gravite: entry.gravite ?? null,
        description: entry.description ?? '',
      })),
    };
  });

  return NextResponse.json(payload);
}
