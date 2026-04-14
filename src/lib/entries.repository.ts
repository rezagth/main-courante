import { prisma, withTenantContext } from '@/lib/prisma';

type ListEntriesParams = {
  tenantId: string;
  siteId?: string;
  from?: Date;
  to?: Date;
  query?: string;
  take?: number;
};

export async function listEntries({
  tenantId,
  siteId,
  from,
  to,
  query,
  take = 50,
}: ListEntriesParams) {
  return withTenantContext(tenantId, async () =>
    prisma.entreeMainCourante.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(siteId ? { siteId } : {}),
        ...(from || to
          ? {
              timestamp: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(query
          ? {
              OR: [
                { description: { contains: query, mode: 'insensitive' } },
                { localisation: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { timestamp: 'desc' },
      take,
    }),
  );
}

export async function softDeleteEntryById(id: string, tenantId: string) {
  return withTenantContext(tenantId, async () =>
    prisma.entreeMainCourante.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    }),
  );
}
