import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type ChefPayload = { noEntryAlert: boolean; refreshedAt: string };

export default async function ChefAnalyticsAlertsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CHEF_EQUIPE', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<ChefPayload>('/api/dashboard/chef?inactivityMinutes=30');

  return (
    <AnalyticsShell title="Alertes de supervision" subtitle="Signalement des périodes sans entrée et rappel de vigilance." actions={<NavChip href="/chef/analytics">Overview</NavChip>}>
      <Panel title="État des alertes">
        <div className={`rounded-2xl border p-5 ${data?.noEntryAlert ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>
          <p className="text-sm uppercase tracking-[0.2em] text-current/70">Alerte silence</p>
          <p className="mt-2 text-2xl font-semibold">{data?.noEntryAlert ? 'ACTIVE' : 'OK'}</p>
          <p className="mt-1 text-sm text-current/80">{data?.noEntryAlert ? 'Aucune entrée récente détectée sur le périmètre.' : 'Le flux terrain est actif et régulier.'}</p>
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
