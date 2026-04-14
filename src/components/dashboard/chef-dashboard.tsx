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
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Dashboard Chef d&apos;equipe</h1>
        <Badge className={isLoading ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}>
          {isLoading
            ? 'Mise a jour...'
            : `Live (maj ${data?.refreshedAt ? new Date(data.refreshedAt).toLocaleTimeString() : '-'})`}
        </Badge>
      </div>

      <Card className="grid gap-2 md:grid-cols-5">
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
          onClick={() => {
            setFrom('');
            setTo('');
            setTypeId('');
            setAgentId('');
            setInactivityMinutes('30');
          }}
        >
          Reinitialiser
        </Button>
      </Card>

      {data?.noEntryAlert ? (
        <Card className="border-red-300 bg-red-50 text-red-800">
          Alerte : aucune entree recente sur la plage configuree.
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-zinc-500">Volume aujourd&apos;hui</p>
          <p className="text-3xl font-bold">{data?.volumeToday ?? 0}</p>
        </Card>
        <Card className="h-64">
          <p className="mb-2 text-sm text-zinc-500">Repartition par type</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data?.byType ?? []} dataKey="count" nameKey="label" outerRadius={90}>
                {(data?.byType ?? []).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Dernieres entrees (refresh 30s)</h2>
          {data?.recent.length ? (
            <div className="space-y-2">
              {data.recent.map((entry) => (
                <article key={entry.id} className="rounded-lg border p-2">
                  <p className="text-sm font-medium">{entry.description}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(entry.timestamp).toLocaleTimeString()} - {entry.user.firstName}{' '}
                    {entry.user.lastName}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucune entree sur cette plage.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Stats par agent</h2>
          {data?.byAgent.length ? (
            <div className="space-y-2">
              {data.byAgent.map((agent) => (
                <div key={agent.userId} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <p className="text-sm font-medium">{agent.agentName}</p>
                    <p className="text-xs text-zinc-500">
                      Derniere activite:{' '}
                      {agent.lastActivity ? new Date(agent.lastActivity).toLocaleString() : 'Aucune'}
                    </p>
                  </div>
                  <Badge>{agent.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucun agent actif sur cette plage.</p>
          )}
        </Card>
      </div>
    </main>
  );
}
