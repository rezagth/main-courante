import { AnalyticsShell, MetricCard, MetricsGrid, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type ClientPayload = { byAgent: Array<{ label: string; count: number }>; total: number };

export default async function ClientAnalyticsAgentsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<ClientPayload>('/api/dashboard/client?days=30&page=0&take=5');

  return (
    <AnalyticsShell title="Analyse par agent" subtitle="Quel agent alimente le plus le registre et à quel rythme ?" actions={<NavChip href="/client/analytics">Overview</NavChip>}>
      <MetricsGrid>
        <MetricCard label="Événements" value={data?.total ?? 0} detail="Volume global" />
        <MetricCard label="Agents actifs" value={data?.byAgent.length ?? 0} detail="Agents ayant écrit" accent="text-indigo-400" />
      </MetricsGrid>
      <Panel title="Classement agents">
        <div className="space-y-2">
          {(data?.byAgent ?? []).map((agent) => (
            <div key={agent.label} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
              <span>{agent.label}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-orange-300">{agent.count}</span>
            </div>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
