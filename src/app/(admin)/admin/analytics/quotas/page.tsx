import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type AdminPayload = { quotas: Array<{ tenantId: string; tenantName: string; activeUsers: number; entriesLast30Days: number; storageS3Mb: number }> };

export default async function AdminAnalyticsQuotasPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<AdminPayload>('/api/dashboard/admin');

  return (
    <AnalyticsShell title="Quotas et consommation" subtitle="Lecture claire des usages et des réserves par tenant." actions={<NavChip href="/admin/analytics">Overview</NavChip>}>
      <Panel title="Consommation des quotas">
        <div className="space-y-3">
          {(data?.quotas ?? []).map((quota) => {
            const storagePct = Math.min(100, Math.round((quota.storageS3Mb / 1024) * 100));
            return (
              <div key={quota.tenantId} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-100">{quota.tenantName}</span>
                  <span className="text-zinc-400">{quota.activeUsers} users · {quota.entriesLast30Days} entries</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/5">
                  <div className="h-2 rounded-full bg-orange-400" style={{ width: `${storagePct}%` }} />
                </div>
                <p className="mt-2 text-xs text-zinc-500">Stockage estimé: {quota.storageS3Mb.toFixed(0)} Mb</p>
              </div>
            );
          })}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
