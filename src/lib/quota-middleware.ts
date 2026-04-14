import { NextResponse } from 'next/server';
import { assertTenantQuota, QuotaExceededError } from '@/lib/quotas';

export async function withQuotaGuard<T>(
  tenantId: string,
  quota: 'active_users' | 'entries_month' | 'storage_gb',
  handler: () => Promise<T>,
) {
  try {
    await assertTenantQuota(tenantId, quota);
    return await handler();
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: error.message, code: 'QUOTA_EXCEEDED', quota: error.quota },
        { status: 402 },
      ) as T;
    }
    throw error;
  }
}
