import { prisma, prismaAdmin, withTenantContext } from '@/lib/prisma';

export class QuotaExceededError extends Error {
  constructor(public quota: string, message: string) {
    super(message);
  }
}

export async function getTenantQuota(tenantId: string) {
  return prismaAdmin.tenantQuota.findUnique({ where: { tenantId } });
}

export async function assertTenantQuota(tenantId: string, kind: 'active_users' | 'entries_month' | 'storage_gb') {
  const quota = await getTenantQuota(tenantId);
  if (!quota) return;

  if (kind === 'active_users') {
    const count = await withTenantContext(tenantId, () => prisma.user.count({ where: { isActive: true } }));
    if (count >= quota.maxActiveUsers) {
      throw new QuotaExceededError('active_users', 'Quota utilisateurs actifs depasse');
    }
  }

  if (kind === 'entries_month') {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const count = await withTenantContext(tenantId, () =>
      prisma.entreeMainCourante.count({
        where: { deletedAt: null, timestamp: { gte: start } },
      }),
    );
    if (count >= quota.maxEntriesPerMonth) {
      throw new QuotaExceededError('entries_month', 'Quota entrees mensuelles depasse');
    }
  }

  if (kind === 'storage_gb') {
    const rows = await withTenantContext(tenantId, () =>
      prisma.entreeMainCourante.count({ where: { deletedAt: null, photoUrl: { not: null } } }),
    );
    const estimatedGb = (rows * 1.2) / 1024;
    if (estimatedGb >= quota.maxStorageGb) {
      throw new QuotaExceededError('storage_gb', 'Quota stockage S3 depasse');
    }
  }
}
