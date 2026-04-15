'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnalyticsShell, NavChip, Panel } from './analytics-shell';

type Entry = {
  id: string;
  timestamp: string;
  description: string;
  localisation?: string | null;
  gravite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE' | null;
  typeEvenement: { label: string };
  user: { firstName: string; lastName: string };
};

type Payload = { data: Entry[]; nextPage: number | null };

export function AgentAnalyticsEntries() {
  const [data, setData] = useState<Payload | null>(null);
  const [page, setPage] = useState(0);

  const query = useMemo(() => new URLSearchParams({ take: '20', page: String(page) }).toString(), [page]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/entries?${query}`);
      if (response.ok) {
        setData((await response.json()) as Payload);
      }
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [query]);

  return (
    <AnalyticsShell title="Entrées agent" subtitle="Historique opérationnel de vos dernières saisies." actions={<NavChip href="/agent/analytics">Overview</NavChip>}>
      <Panel title="Historique">
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full divide-y divide-white/5 text-sm">
            <thead className="bg-white/[0.02] text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Localisation</th>
                <th className="px-4 py-3">Gravité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(data?.data ?? []).map((entry) => (
                <tr key={entry.id} className="text-zinc-300">
                  <td className="px-4 py-3 text-zinc-400">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">{entry.typeEvenement.label}</td>
                  <td className="px-4 py-3">{entry.description}</td>
                  <td className="px-4 py-3">{entry.localisation ?? '—'}</td>
                  <td className="px-4 py-3 text-orange-300">{entry.gravite ?? 'N/C'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>Précédent</button>
          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10" onClick={() => setPage((value) => value + 1)} disabled={data?.nextPage === null}>Suivant</button>
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
