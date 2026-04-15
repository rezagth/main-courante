import { NextResponse } from 'next/server';
import { getAnalytics, getTenantUsage } from '@/lib/analytics';

export async function GET() {
  try {
    const analytics = await getAnalytics();

    const overview = {
      business: {
        totalTenants: analytics.totalTenants,
        activeSubscriptions: analytics.activeSubscriptions,
        mrr: analytics.mrr,
        arr: analytics.arr,
        churnRate: analytics.churnRate,
      },
      usage: {
        totalUsers: analytics.totalTenants * analytics.avgUsersPerTenant,
        avgUsersPerTenant: analytics.avgUsersPerTenant,
        totalEntries: analytics.totalEntries,
      },
      system: {
        timestamp: analytics.lastUpdated.toISOString(),
        topFeatures: analytics.topFeatures,
      },
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
