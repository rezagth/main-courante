import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type AdminPayload = { tenants: Array<{ id: string; name: string; code: string; status: string; plan: string; lastActivityAt: string | null; activeUsers: number; last30DaysEntries: number; featureFlags: Array<{ key: string; enabled: boolean }>; quota: { maxActiveUsers: number; maxEntriesPerMonth: number; maxStorageGb: number } | null; }> };

export default async function AdminAnalyticsTenantsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<AdminPayload>('/api/dashboard/admin');

  return (
    <AnalyticsShell title="Tenant analytics" subtitle="Suivi détaillé par locataire : activité, quotas, flags et état." actions={<NavChip href="/admin/analytics">Overview</NavChip>}>
      <Panel title="Liste des tenants">
        <div className="grid gap-3 xl:grid-cols-2">
          {(data?.tenants ?? []).map((tenant) => (
            <article key={tenant.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-zinc-100">{tenant.name}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{tenant.code}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">{tenant.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-zinc-400">
                <div>Users<br /><span className="text-zinc-100">{tenant.activeUsers}</span></div>
                <div>Entries<br /><span className="text-zinc-100">{tenant.last30DaysEntries}</span></div>
                <div>Plan<br /><span className="text-zinc-100">{tenant.plan}</span></div>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
