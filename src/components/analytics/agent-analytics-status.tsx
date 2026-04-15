'use client';

import { useEffect, useState } from 'react';
import { AnalyticsShell, NavChip, Panel } from './analytics-shell';

type Payload = {
  alerts: Record<string, unknown>;
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  db: boolean;
  s3: boolean;
};

export function AgentAnalyticsStatus() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/status');
      if (response.ok) {
        setData((await response.json()) as Payload);
      }
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <AnalyticsShell title="Statut opérationnel" subtitle="Santé technique du tenant et disponibilité des services." actions={<NavChip href="/agent/analytics">Overview</NavChip>}>
      <Panel title="Santé système">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-300">Statut: <span className={data?.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}>{data?.status ?? '...'}</span></div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-300">DB: <span className={data?.db ? 'text-emerald-400' : 'text-red-400'}>{data?.db ? 'OK' : 'KO'}</span></div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-300">S3: <span className={data?.s3 ? 'text-emerald-400' : 'text-red-400'}>{data?.s3 ? 'OK' : 'KO'}</span></div>
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
