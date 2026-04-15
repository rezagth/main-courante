import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type AdminPayload = { tenants: Array<{ id: string; name: string; featureFlags: Array<{ key: string; enabled: boolean }> }> };

export default async function AdminAnalyticsFeaturesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<AdminPayload>('/api/dashboard/admin');

  return (
    <AnalyticsShell title="Fonctions activées" subtitle="État des feature flags par locataire." actions={<NavChip href="/admin/analytics">Overview</NavChip>}>
      <Panel title="Feature flags">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data?.tenants ?? []).map((tenant) => (
            <article key={tenant.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <h3 className="font-medium text-zinc-100">{tenant.name}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(tenant.featureFlags ?? []).map((flag) => (
                  <span key={flag.key} className={`rounded-full border px-2 py-0.5 text-xs ${flag.enabled ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                    {flag.key}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
