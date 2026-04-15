import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type ChefPayload = { recent: Array<{ id: string; timestamp: string; description: string; user: { firstName: string; lastName: string } }> };

export default async function ChefAnalyticsActivityPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CHEF_EQUIPE', 'PATRON', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<ChefPayload>('/api/dashboard/chef?inactivityMinutes=30');

  return (
    <AnalyticsShell title="Activité équipe" subtitle="Lecture chronologique des dernières remontées terrain." actions={<NavChip href="/chef/analytics">Overview</NavChip>}>
      <Panel title="Flux récent">
        <div className="space-y-2">
          {(data?.recent ?? []).map((entry) => (
            <div key={entry.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between">
                <span>{entry.description}</span>
                <span className="text-zinc-500">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-zinc-400">{entry.user.firstName} {entry.user.lastName}</p>
            </div>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
