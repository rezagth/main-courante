'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnalyticsShell, MetricCard, MetricsGrid, NavChip, Panel } from './analytics-shell';

type ClientPayload = {
  rows: Array<{
    id: string;
    timestamp: string;
    description: string;
    gravite?: string | null;
    site: { name: string };
    user: { firstName: string; lastName: string };
    typeEvenement: { label: string };
  }>;
  total: number;
  nextPage: number | null;
  bySite: Array<{ label: string; count: number }>;
  byType: Array<{ label: string; count: number }>;
  byAgent: Array<{ label: string; count: number }>;
  trend: Array<{ timestamp: string }>;
  heatmap: Array<{ day: number; hour: number; count: number }>;
};

export function ClientAnalyticsOverview() {
  const [data, setData] = useState<ClientPayload | null>(null);
  const [days, setDays] = useState('30');
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('days', days);
    params.set('page', String(page));
    params.set('take', '10');
    return params.toString();
  }, [days, page]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/client?${query}`);
      if (response.ok) {
        setData((await response.json()) as ClientPayload);
      }
      setIsLoading(false);
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [query]);

  const peakPoint = useMemo(
    () => {
      const heatmap = data?.heatmap ?? [];
      if (!heatmap.length) return undefined;
      return heatmap.reduce((current, item) => (item.count > current.count ? item : current), heatmap[0]);
    },
    [data?.heatmap],
  );

  return (
    <AnalyticsShell
      title="Tableau de bord client"
      subtitle="Vue analytique complète sur l’activité, les sites, les types d’événements et les horaires de charge."
      actions={(
        <>
          <NavChip href="/api/dashboard/client/export/csv">CSV</NavChip>
          <NavChip href="/api/dashboard/client/export/pdf">PDF</NavChip>
          <NavChip href="/client/analytics/trends">Tendances</NavChip>
        </>
      )}
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-xs text-zinc-400">
        <span>{isLoading ? 'Mise à jour...' : `Live · ${data?.rows?.length ?? 0} lignes chargées`}</span>
        <div className="flex gap-2">
          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" onClick={() => setDays('7')}>7j</button>
          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" onClick={() => setDays('30')}>30j</button>
          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" onClick={() => setDays('90')}>90j</button>
        </div>
      </div>

      <MetricsGrid>
        <MetricCard label="Événements" value={data?.total ?? 0} detail="Sur la période sélectionnée" />
        <MetricCard label="Site principal" value={data?.bySite?.[0]?.label ?? 'N/A'} detail="Site le plus actif" accent="text-teal-400" />
        <MetricCard label="Type dominant" value={data?.byType?.[0]?.label ?? 'N/A'} detail="Répartition par type" accent="text-indigo-400" />
        <MetricCard label="Pic horaire" value={peakPoint ? `${String(peakPoint.hour).padStart(2, '0')}h` : '--'} detail="Créneau le plus chargé" accent="text-orange-300" />
      </MetricsGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Tendance récente">
          <div className="space-y-2">
            {(data?.trend ?? []).slice(-10).map((item) => (
              <div key={item.timestamp} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
                <span>{new Date(item.timestamp).toLocaleString()}</span>
                <span className="text-orange-400">●</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Derniers événements">
          <div className="space-y-2">
            {(data?.rows ?? []).map((entry) => (
              <article key={entry.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-100">{entry.description}</p>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">{entry.gravite ?? 'N/C'}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{entry.typeEvenement.label} · {entry.site.name} · {entry.user.firstName} {entry.user.lastName}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </AnalyticsShell>
  );
}
