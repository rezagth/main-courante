'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type ChefPayload = {
  volumeToday: number;
  byType: Array<{ typeId: string; label: string; count: number }>;
  recent: Array<{
    id: string;
    timestamp: string;
    description: string;
    user: { firstName: string; lastName: string };
  }>;
  byAgent: Array<{
    userId: string;
    agentName: string;
    count: number;
    lastActivity: string | null;
  }>;
  typeOptions: Array<{ id: string; label: string }>;
  agentOptions: Array<{ userId: string; agentName: string }>;
  refreshedAt: string;
  noEntryAlert: boolean;
};

const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ChefDashboard() {
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
  }, [from, to, typeId, agentId, inactivityMinutes]);

  const summary = useMemo(() => {
    const topType = [...(data?.byType ?? [])].sort((left, right) => right.count - left.count)[0];
    const topAgent = [...(data?.byAgent ?? [])].sort((left, right) => right.count - left.count)[0];
    const latestEntry = data?.recent?.[0];

    return {
      topType,
      topAgent,
      latestEntry,
    };
  }, [data]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const res = await fetch(`/api/dashboard/chef?${query}`);
      if (res.ok) {
        setData((await res.json()) as ChefPayload);
      }
      setIsLoading(false);
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [query]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.16),transparent_45%),#111111] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Chef d’équipe</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Dashboard de supervision</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Vue de contrôle des entrées terrain, des agents actifs et des alertes d’inactivité sur la période sélectionnée.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={isLoading ? 'border-amber-400/20 bg-amber-500/10 text-amber-300' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'}>
              {isLoading
                ? 'Mise à jour...'
                : `Live · ${data?.refreshedAt ? new Date(data.refreshedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}`}
            </Badge>
            {data?.noEntryAlert ? (
              <Badge className="border-red-400/20 bg-red-500/10 text-red-300">Alerte d’inactivité</Badge>
            ) : (
              <Badge className="border-white/10 bg-white/5 text-zinc-300">Flux normal</Badge>
            )}
          </div>
        </div>
      </section>

      <Card className="border-white/10 bg-[#111111] p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">Tous les types</option>
            {data?.typeOptions.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </Select>
          <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">Tous les agents</option>
            {data?.agentOptions.map((agent) => (
              <option key={agent.userId} value={agent.userId}>
                {agent.agentName}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={5}
            value={inactivityMinutes}
            onChange={(e) => setInactivityMinutes(e.target.value)}
            placeholder="Alerte inactivite (minutes)"
          />
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
            onClick={() => {
              setFrom('');
              setTo('');
              setTypeId('');
              setAgentId('');
              setInactivityMinutes('30');
            }}
          >
            Réinitialiser
          </Button>
        </div>
      </Card>

      {data?.noEntryAlert ? (
        <Card className="border-red-400/20 bg-red-500/10 p-4 text-red-100">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium">Aucune entrée récente sur la plage configurée.</p>
              <p className="mt-1 text-sm text-red-100/80">Vérifie les agents en tournée ou ajuste le seuil d’inactivité.</p>
            </div>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/10 bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Volume aujourd’hui</p>
          <p className="mt-2 text-3xl font-semibold text-orange-300">{data?.volumeToday ?? 0}</p>
          <p className="mt-1 text-xs text-zinc-500">Entrées enregistrées</p>
        </Card>
        <Card className="border-white/10 bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Type dominant</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{summary.topType?.label ?? 'N/A'}</p>
          <p className="mt-1 text-xs text-zinc-500">{summary.topType?.count ?? 0} occurrences</p>
        </Card>
        <Card className="border-white/10 bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Agent leader</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{summary.topAgent?.agentName ?? 'N/A'}</p>
          <p className="mt-1 text-xs text-zinc-500">{summary.topAgent?.count ?? 0} entrées</p>
        </Card>
        <Card className="border-white/10 bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Dernière entrée</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {summary.latestEntry ? new Date(summary.latestEntry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{summary.latestEntry?.description ?? 'Aucune entrée'}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-[#101010] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Répartition par type</h2>
              <p className="text-xs text-zinc-500">Lecture rapide de la nature des événements</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.byType ?? []} dataKey="count" nameKey="label" outerRadius={92} innerRadius={56} paddingAngle={2}>
                  {(data?.byType ?? []).map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-white/10 bg-[#101010] p-5">
          <h2 className="text-sm font-medium text-zinc-100">Résumé rapide</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-zinc-500">Dernier événement</p>
              <p className="mt-1 text-sm text-zinc-200">{summary.latestEntry?.description ?? 'Aucune donnée'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-zinc-500">Agent le plus actif</p>
              <p className="mt-1 text-sm text-zinc-200">{summary.topAgent?.agentName ?? 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-zinc-500">Alerte d’inactivité</p>
              <p className={`mt-1 text-sm ${data?.noEntryAlert ? 'text-red-300' : 'text-emerald-300'}`}>
                {data?.noEntryAlert ? 'Active' : 'Aucune'}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-[#101010] p-5">
          <h2 className="mb-3 text-sm font-medium text-zinc-100">Dernières entrées</h2>
          {data?.recent.length ? (
            <div className="space-y-2">
              {data.recent.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-medium text-zinc-100">{entry.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {entry.user.firstName} {entry.user.lastName}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucune entrée sur cette plage.</p>
          )}
        </Card>

        <Card className="border-white/10 bg-[#101010] p-5">
          <h2 className="mb-3 text-sm font-medium text-zinc-100">Stats par agent</h2>
          {data?.byAgent.length ? (
            <div className="space-y-2">
              {data.byAgent.map((agent) => (
                <div key={agent.userId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{agent.agentName}</p>
                    <p className="text-xs text-zinc-500">
                      Dernière activité: {agent.lastActivity ? new Date(agent.lastActivity).toLocaleString('fr-FR') : 'Aucune'}
                    </p>
                  </div>
                  <Badge className="border-white/10 bg-white/5 text-zinc-100">{agent.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucun agent actif sur cette plage.</p>
          )}
        </Card>
      </section>
    </main>
  );
}
