import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type ClientPayload = { total: number; bySite: Array<{ label: string; count: number }>; byType: Array<{ label: string; count: number }> };

export default async function ClientAnalyticsExportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<ClientPayload>('/api/dashboard/client?days=30&page=0&take=5');

  return (
    <AnalyticsShell title="Exports et diffusion" subtitle="Téléchargements disponibles et structure des exports utilisés par le terrain." actions={<NavChip href="/client/analytics">Overview</NavChip>}>
      <Panel title="Téléchargements">
        <div className="flex flex-wrap gap-2">
          <NavChip href="/api/dashboard/client/export/csv">Télécharger CSV</NavChip>
          <NavChip href="/api/dashboard/client/export/pdf">Télécharger PDF</NavChip>
        </div>
      </Panel>
      <Panel title="Contenu des exports">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-300">Timestamp: horodatage normalisé</div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-300">Type: libellé opérationnel</div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-300">Gravité, site et agent inclus</div>
        </div>
        <div className="mt-4 space-y-2 text-sm text-zinc-400">
          <p>Total événements exportables: {data?.total ?? 0}</p>
          <p>Sites couverts: {data?.bySite.length ?? 0}</p>
          <p>Types couverts: {data?.byType.length ?? 0}</p>
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
