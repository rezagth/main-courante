'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnalyticsShell, MetricCard, MetricsGrid, NavChip, Panel } from './analytics-shell';

type Entry = {
  id: string;
  timestamp: string;
  description: string;
  localisation?: string | null;
  gravite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE' | null;
  typeEvenement: { label: string };
  user: { firstName: string; lastName: string };
};

type EntriesPayload = { data: Entry[]; nextPage: number | null };
type TypesPayload = { data: Array<{ id: string; code: string; label: string }> };

export function AgentAnalyticsOverview() {
  const [entries, setEntries] = useState<EntriesPayload | null>(null);
  const [types, setTypes] = useState<TypesPayload | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const query = useMemo(() => new URLSearchParams({ take: '20', page: String(page) }).toString(), [page]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [entriesResponse, typesResponse] = await Promise.all([
        fetch(`/api/entries?${query}`),
        fetch('/api/entries/types'),
      ]);

      if (entriesResponse.ok) {
        setEntries((await entriesResponse.json()) as EntriesPayload);
      }
      if (typesResponse.ok) {
        setTypes((await typesResponse.json()) as TypesPayload);
      }
      setIsLoading(false);
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [query]);

  const latest = entries?.data?.[0];

  return (
    <AnalyticsShell
      title="Analytics agent"
      subtitle="Lecture opérationnelle de vos dernières entrées, des types disponibles et du rythme de saisie."
      actions={(
        <>
          <NavChip href="/agent/analytics/entries">Entrées</NavChip>
          <NavChip href="/agent/analytics/types">Types</NavChip>
          <NavChip href="/agent/analytics/status">Statut</NavChip>
        </>
      )}
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-xs text-zinc-400">
        <span>{isLoading ? 'Mise à jour...' : 'Live agent'}</span>
        <div className="flex gap-2">
          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>Précédent</button>
          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" onClick={() => setPage((value) => value + 1)} disabled={entries?.nextPage === null}>Suivant</button>
        </div>
      </div>

      <MetricsGrid>
        <MetricCard label="Entrées chargées" value={entries?.data.length ?? 0} detail="Page courante" />
        <MetricCard label="Types actifs" value={types?.data.length ?? 0} detail="Référentiel du tenant" accent="text-teal-400" />
        <MetricCard label="Dernière entrée" value={latest ? new Date(latest.timestamp).toLocaleTimeString() : '--'} detail={latest?.description ?? 'Aucune donnée'} accent="text-orange-300" />
        <MetricCard label="Gravité" value={latest?.gravite ?? 'N/C'} detail="Dernière saisie" accent="text-indigo-400" />
      </MetricsGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Dernières entrées">
          <div className="space-y-2">
            {(entries?.data ?? []).slice(0, 8).map((entry) => (
              <article key={entry.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-300">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-zinc-100">{entry.description}</p>
                  <span className="text-zinc-500">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-zinc-400">{entry.typeEvenement.label} · {entry.user.firstName} {entry.user.lastName}</p>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Types disponibles">
          <div className="space-y-2">
            {(types?.data ?? []).map((type) => (
              <div key={type.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{type.label}</p>
                  <p className="text-xs text-zinc-500">{type.code}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">Actif</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AnalyticsShell>
  );
}
