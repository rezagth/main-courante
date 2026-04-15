import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type EntryPayload = {
  data: Array<{
    id: string;
    timestamp: string;
    description: string;
    gravite?: string | null;
    site?: { name?: string | null } | null;
    user?: { firstName?: string | null; lastName?: string | null } | null;
    typeEvenement?: { label?: string | null } | null;
  }>;
  nextPage: number | null;
};

export default async function ClientAnalyticsEntriesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<EntryPayload>('/api/entries?take=30&page=0');

  return (
    <AnalyticsShell
      title="Journal des entrées"
      subtitle="Consultation détaillée des événements, avec export rapide et lecture chronologique."
      actions={(
        <>
          <NavChip href="/client/analytics">Retour overview</NavChip>
          <NavChip href="/api/dashboard/client/export/csv">CSV</NavChip>
          <NavChip href="/api/dashboard/client/export/pdf">PDF</NavChip>
        </>
      )}
    >
      <Panel title={`Entrées récentes (${data?.data.length ?? 0})`}>
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full divide-y divide-white/5 text-sm">
            <thead className="bg-white/[0.02] text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Gravité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(data?.data ?? []).map((row) => (
                <tr key={row.id} className="text-zinc-300">
                  <td className="px-4 py-3 text-zinc-400">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.typeEvenement?.label ?? 'N/C'}</td>
                  <td className="px-4 py-3">{row.description}</td>
                  <td className="px-4 py-3">{row.site?.name ?? 'N/C'}</td>
                  <td className="px-4 py-3">{[row.user?.firstName, row.user?.lastName].filter(Boolean).join(' ') || 'N/C'}</td>
                  <td className="px-4 py-3 text-orange-400">{row.gravite ?? 'N/C'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
