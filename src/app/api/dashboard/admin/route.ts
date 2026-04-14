import { NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/authorization';
import { cachedJson } from '@/lib/cache';
import { prismaAdmin } from '@/lib/prisma';

export async function GET() {
  await requireAnyRole(['SUPER_ADMIN']);

  const payload = await cachedJson('analytics:admin:global:30d', async () => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [tenants, activeUsers, entriesByTenant, featureFlags, quotaRows] = await Promise.all([
      prismaAdmin.tenant.findMany({
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          plan: true,
          lastActivityAt: true,
        },
      }),
      prismaAdmin.user.groupBy({
        by: ['tenantId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prismaAdmin.entreeMainCourante.groupBy({
        by: ['tenantId'],
        where: { deletedAt: null, timestamp: { gte: from } },
        _count: { _all: true },
      }),
      prismaAdmin.tenantFeatureFlag.findMany({
        select: { tenantId: true, key: true, enabled: true },
      }),
      prismaAdmin.tenantQuota.findMany(),
    ]);

    const usersMap = Object.fromEntries(activeUsers.map((x) => [x.tenantId, x._count._all]));
    const entriesMap = Object.fromEntries(entriesByTenant.map((x) => [x.tenantId, x._count._all]));
    const quotaMap = Object.fromEntries(quotaRows.map((q) => [q.tenantId, q]));
    const flagsMap = featureFlags.reduce<Record<string, Array<{ key: string; enabled: boolean }>>>(
      (acc, item) => {
        if (!acc[item.tenantId]) acc[item.tenantId] = [];
        acc[item.tenantId].push({ key: item.key, enabled: item.enabled });
        return acc;
      },
      {},
    );

    const quotas = tenants.map((tenant) => ({
      tenantId: tenant.id,
      tenantName: tenant.name,
      activeUsers: usersMap[tenant.id] ?? 0,
      entriesLast30Days: entriesMap[tenant.id] ?? 0,
      storageS3Mb: (entriesMap[tenant.id] ?? 0) * 1.2,
    }));

    return {
      totals: {
        tenants: tenants.length,
        entriesLast30Days: Object.values(entriesMap).reduce((a, b) => a + b, 0),
      },
      tenants: tenants.map((tenant) => ({
        ...tenant,
        last30DaysEntries: entriesMap[tenant.id] ?? 0,
        activeUsers: usersMap[tenant.id] ?? 0,
        featureFlags: flagsMap[tenant.id] ?? [],
        quota: quotaMap[tenant.id] ?? null,
      })),
      quotas,
    };
  });

  return NextResponse.json(payload);
}
