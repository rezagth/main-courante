'use client';

import { useEffect, useState } from 'react';
import { AnalyticsShell, NavChip, Panel } from './analytics-shell';

type Payload = { data: Array<{ id: string; code: string; label: string }> };

export function AgentAnalyticsTypes() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/entries/types');
      if (response.ok) {
        setData((await response.json()) as Payload);
      }
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <AnalyticsShell title="Types agent" subtitle="Référentiel des types d’événements activés sur le tenant." actions={<NavChip href="/agent/analytics">Overview</NavChip>}>
      <Panel title="Liste des types">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data?.data ?? []).map((type) => (
            <article key={type.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <h3 className="font-medium text-zinc-100">{type.label}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{type.code}</p>
            </article>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
