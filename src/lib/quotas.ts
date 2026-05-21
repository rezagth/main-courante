import { prismaAdmin } from '@/lib/prisma';

export class QuotaExceededError extends Error {
  constructor(public quota: string, message: string) {
    super(message);
  }
}

type QuotaOptions = {
  additionalBytes?: number;
};

export async function getTenantQuota(tenantId: string) {
  return prismaAdmin.tenantQuota.findUnique({ where: { tenantId } });
}

export async function assertTenantQuota(
  tenantId: string,
  kind: 'active_users' | 'entries_month' | 'storage_gb',
  options: QuotaOptions = {},
) {
  const quota = await getTenantQuota(tenantId);
  if (!quota) return;

  if (kind === 'active_users') {
    const count = await prismaAdmin.user.count({ where: { tenantId, isActive: true } });
    if (count >= quota.maxActiveUsers) {
      throw new QuotaExceededError('active_users', 'Quota utilisateurs actifs depasse');
    }
  }

  if (kind === 'entries_month') {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const count = await prismaAdmin.entreeMainCourante.count({
      where: { tenantId, deletedAt: null, timestamp: { gte: start } },
    });
    if (count >= quota.maxEntriesPerMonth) {
      throw new QuotaExceededError('entries_month', 'Quota entrees mensuelles depasse');
    }
  }

  if (kind === 'storage_gb') {
    const rows = await prismaAdmin.$queryRaw<Array<{ total_bytes: bigint | number | null }>>`
      SELECT COALESCE(SUM(photo_size_bytes), 0) AS total_bytes
      FROM "entrees_main_courante"
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
    `;

    const rawTotal = rows[0]?.total_bytes ?? 0;
    const usedBytes = Number(rawTotal);
    const additionalBytes = options.additionalBytes ?? 0;
    const totalGb = (usedBytes + additionalBytes) / (1024 * 1024 * 1024);

    if (totalGb >= quota.maxStorageGb) {
      throw new QuotaExceededError('storage_gb', 'Quota stockage depasse');
    }
  }
}
