import { AnalyticsShell, NavChip, Panel } from '@/components/analytics/analytics-shell';
import { fetchServerJson } from '@/lib/server-json';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type ClientPayload = { trend: Array<{ timestamp: string }>; heatmap: Array<{ day: number; hour: number; count: number }> };

const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default async function ClientAnalyticsTrendsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'PATRON', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  const data = await fetchServerJson<ClientPayload>('/api/dashboard/client?days=30&page=0&take=10');

  return (
    <AnalyticsShell title="Tendances et chaleur" subtitle="Lecture temporelle de l’activité avec tendance et matrice horaire." actions={<NavChip href="/client/analytics">Overview</NavChip>}>
      <Panel title="Timeline récente">
        <div className="space-y-2">
          {(data?.trend ?? []).slice(-12).map((point) => (
            <div key={point.timestamp} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
              {new Date(point.timestamp).toLocaleString()}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Heatmap horaire">
        <div className="overflow-hidden rounded-xl border border-white/5">
          <div className="grid grid-cols-12 gap-1 bg-[#0f0f0f] p-2 text-[10px] text-zinc-500">
            {Array.from({ length: 12 }, (_, hour) => (
              <span key={hour} className="text-center">{hour.toString().padStart(2, '0')}h</span>
            ))}
          </div>
          <div className="space-y-1 p-2">
            {Array.from({ length: 7 }, (_, day) => (
              <div key={day} className="grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }, (_, hour) => {
                  const count = data?.heatmap?.find((item) => item.day === day && item.hour === hour)?.count ?? 0;
                  const opacity = Math.min(1, count / 5 + 0.1);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="h-6 rounded-md border border-white/5"
                      style={{ backgroundColor: `rgba(249,115,22,${opacity})` }}
                      title={`${days[day]} ${hour}h: ${count}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
