'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnalyticsShell, MetricCard, MetricsGrid, NavChip, Panel } from './analytics-shell';

type ChefPayload = {
  volumeToday: number;
  byType: Array<{ typeId: string; label: string; count: number }>;
  recent: Array<{ id: string; timestamp: string; description: string; user: { firstName: string; lastName: string } }>;
  byAgent: Array<{ userId: string; agentName: string; count: number; lastActivity: string | null }>;
  typeOptions: Array<{ id: string; label: string }>;
  agentOptions: Array<{ userId: string; agentName: string }>;
  refreshedAt: string;
  noEntryAlert: boolean;
};

const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ChefAnalyticsOverview() {
  const [data, setData] = useState<ChefPayload | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [typeId, setTypeId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [inactivityMinutes, setInactivityMinutes] = useState('30');
  const [isLoading, setIsLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (typeId) params.set('typeId', typeId);
    if (agentId) params.set('agentId', agentId);
    params.set('inactivityMinutes', inactivityMinutes);
    return params.toString();
  }, [agentId, from, inactivityMinutes, to, typeId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/chef?${query}`);
      if (response.ok) {
        setData((await response.json()) as ChefPayload);
      }
      setIsLoading(false);
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [query]);

  const alertLabel = data?.noEntryAlert ? 'ACTIVE' : 'OK';

  return (
    <AnalyticsShell
      title="Pilotage équipe"
      subtitle="Vue de supervision pour suivre le volume, les agents actifs et les alertes de silence."
      actions={<NavChip href="/chef/analytics/activity">Activité</NavChip>}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#121212] p-4 text-xs text-zinc-400">
        <div>{isLoading ? 'Mise à jour...' : `Live (maj ${data?.refreshedAt ? new Date(data.refreshedAt).toLocaleTimeString() : '-'})`}</div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <input className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200" type="number" min={5} value={inactivityMinutes} onChange={(e) => setInactivityMinutes(e.target.value)} />
          <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10" onClick={() => { setFrom(''); setTo(''); setTypeId(''); setAgentId(''); setInactivityMinutes('30'); }}>
            Réinitialiser
          </button>
        </div>
      </div>

      {data?.noEntryAlert ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">
          Alerte : aucune entrée récente sur la plage configurée.
        </div>
      ) : null}

      <MetricsGrid>
        <MetricCard label="Volume aujourd’hui" value={data?.volumeToday ?? 0} detail="Entrées enregistrées" />
        <MetricCard label="Type dominant" value={data?.byType?.[0]?.label ?? 'N/A'} detail="Répartition par type" accent="text-teal-400" />
        <MetricCard label="Agents actifs" value={data?.byAgent?.length ?? 0} detail="Agents avec remontées" accent="text-indigo-400" />
        <MetricCard label="Alerte silence" value={alertLabel} detail={data?.noEntryAlert ? 'Aucune entrée récente' : 'Flux normal'} accent={data?.noEntryAlert ? 'text-red-400' : 'text-emerald-400'} />
      </MetricsGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Répartition par type">
          <div className="space-y-3">
            {(data?.byType ?? []).map((item, idx) => (
              <div key={item.typeId} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-orange-400">{item.count}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(100, item.count * 10)}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Stats par agent">
          <div className="space-y-2">
            {(data?.byAgent ?? []).map((agent) => (
              <div key={agent.userId} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{agent.agentName}</p>
                  <p className="text-xs text-zinc-500">Dernière activité : {agent.lastActivity ? new Date(agent.lastActivity).toLocaleString() : 'Aucune'}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-orange-300">{agent.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Dernières entrées">
        <div className="space-y-2">
          {(data?.recent ?? []).map((entry) => (
            <article key={entry.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-zinc-100">{entry.description}</p>
                <span className="text-zinc-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="mt-1 text-zinc-400">{entry.user.firstName} {entry.user.lastName}</p>
            </article>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
