import { AnalyticsShell, MetricCard, MetricsGrid, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type ClientPayload = { bySite: Array<{ label: string; count: number }>; total: number };

export default async function ClientAnalyticsSitesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<ClientPayload>('/api/dashboard/client?days=30&page=0&take=5');

  return (
    <AnalyticsShell title="Analyse par site" subtitle="Répartition des événements par site et concentration de l’activité." actions={<NavChip href="/client/analytics">Overview</NavChip>}>
      <MetricsGrid>
        <MetricCard label="Total événements" value={data?.total ?? 0} detail="Périmètre actuel" />
        <MetricCard label="Sites observés" value={data?.bySite.length ?? 0} detail="Sites avec activité" accent="text-teal-400" />
      </MetricsGrid>
      <Panel title="Distribution des sites">
        <div className="space-y-3">
          {(data?.bySite ?? []).map((site) => (
            <div key={site.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-sm">
                <span>{site.label}</span>
                <span className="text-zinc-400">{site.count}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-teal-400" style={{ width: `${Math.min(100, site.count * 10)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
