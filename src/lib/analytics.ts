import { prisma } from '@/lib/prisma';

export interface Analytics {
  totalTenants: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  churnRate: number;
  avgUsersPerTenant: number;
  totalEntries: number;
  topFeatures: string[];
  lastUpdated: Date;
}

export async function getAnalytics(): Promise<Analytics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Tenant metrics
  const totalTenants = await prisma.tenant.count();
  const activeTenants = await prisma.tenant.count({
    where: { status: 'ACTIVE' },
  });
  const newTenantsMonth = await prisma.tenant.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  // User metrics
  const totalUsers = await prisma.user.count();
  const avgUsersPerTenant = Math.round(totalUsers / (totalTenants || 1));

  // Entry metrics
  const totalEntries = await prisma.entreeMainCourante.count();
  const entriesMonth = await prisma.entreeMainCourante.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  // Revenue metrics (if using Stripe)
  const mrr = 0; // TODO: Calculate from Stripe data
  const arr = mrr * 12;

  // Churn calculation
  const cancelledMonth = await prisma.tenant.count({
    where: {
      status: 'CANCELLED',
      updatedAt: { gte: thirtyDaysAgo },
    },
  });
  const churnRate = activeTenants > 0 ? (cancelledMonth / activeTenants) * 100 : 0;

  return {
    totalTenants,
    activeSubscriptions: activeTenants,
    mrr,
    arr,
    churnRate: Math.round(churnRate * 100) / 100,
    avgUsersPerTenant,
    totalEntries,
    topFeatures: ['Offline mode', 'PDF export', 'Photo upload'],
    lastUpdated: now,
  };
}

export async function trackEvent(
  tenantId: string,
  userId: string | null,
  eventName: string,
  metadata?: Record<string, any>
) {
  // Log to Sentry or analytics service
  console.log(`Event: ${eventName}`, {
    tenantId,
    userId,
    timestamp: new Date(),
    ...metadata,
  });

  // TODO: Send to Mixpanel, Amplitude, or custom analytics
}

export async function getTenantUsage(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      quotas: true,
    },
  });

  if (!tenant) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeUsers = await prisma.user.count({
    where: {
      tenantId,
      isActive: true,
    },
  });

  const entriesThisMonth = await prisma.entreeMainCourante.count({
    where: {
      tenantId,
      createdAt: { gte: monthStart },
    },
  });

  return {
    activeUsers,
    maxUsers: tenant.quotas?.maxActiveUsers || 25,
    entriesThisMonth,
    maxEntriesPerMonth: tenant.quotas?.maxEntriesPerMonth || 10000,
    storageGb: 0, // TODO: Calculate S3 usage
    maxStorageGb: tenant.quotas?.maxStorageGb || 20,
  };
}
