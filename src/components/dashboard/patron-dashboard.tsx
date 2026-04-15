'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type PatronPayload = {
  totals: {
    tenants: number;
    users: number;
    sites: number;
    teams: number;
    entriesLast30Days: number;
  };
  tenants: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    users: number;
    sites: number;
    teams: number;
    entriesLast30Days: number;
  }>;
  recentEntries: Array<{
    id: string;
    timestamp: string;
    tenantName: string;
    siteName: string;
    agentName: string;
    typeLabel: string;
    gravite: string | null;
    description: string;
  }>;
};

export function PatronDashboard() {
  const [data, setData] = useState<PatronPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/dashboard/patron', { cache: 'no-store' });
    if (res.ok) {
      setData((await res.json()) as PatronPayload);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const kpis = useMemo(
    () => [
      { label: 'Tenants', value: data?.totals.tenants ?? 0 },
      { label: 'Utilisateurs', value: data?.totals.users ?? 0 },
      { label: 'Sites', value: data?.totals.sites ?? 0 },
      { label: 'Équipes', value: data?.totals.teams ?? 0 },
      { label: 'Entrées (30j)', value: data?.totals.entriesLast30Days ?? 0 },
    ],
    [data],
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.16),transparent_45%),#111111] p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Patron · Pilotage</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Gestion complète</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Supervise les entrées terrain, pilote les équipes et crée les nouveaux tenants (clients hôpitaux) depuis un espace dédié patron.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/patron/personnel" className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100 hover:bg-blue-500/20">
            Gestion personnel
          </Link>
          <Link href="/patron/onboarding" className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 hover:bg-amber-500/20">
            + Créer un tenant
          </Link>
          <Link href="/chef/analytics/activity" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10">
            Activité agents
          </Link>
          <Link href="/client/analytics/entries" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10">
            Analytics entrées
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-xl border border-white/10 bg-[#111111] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-white/10 bg-[#111111] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-100">Tenants suivis</h2>
            <button onClick={load} className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10" type="button">
              Actualiser
            </button>
          </div>

          {loading && !data ? <p className="text-sm text-zinc-500">Chargement...</p> : null}

          <div className="space-y-2">
            {data?.tenants.length ? (
              data.tenants.map((tenant) => (
                <div key={tenant.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                  <p className="font-medium text-zinc-100">{tenant.name}</p>
                  <p className="text-xs text-zinc-500">{tenant.code} · {tenant.status}</p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-zinc-400">
                    <span>{tenant.users} users</span>
                    <span>{tenant.sites} sites</span>
                    <span>{tenant.teams} équipes</span>
                    <span>{tenant.entriesLast30Days} entrées</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">Aucun tenant trouvé.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-[#111111] p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-100">Dernières entrées agents</h2>
          <div className="space-y-2">
            {data?.recentEntries.length ? (
              data.recentEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-300">
                  <p className="font-medium text-zinc-100">{entry.typeLabel} · {entry.agentName}</p>
                  <p className="mt-1 text-zinc-500">{new Date(entry.timestamp).toLocaleString()} · {entry.tenantName} / {entry.siteName}</p>
                  <p className="mt-1 line-clamp-2 text-zinc-300">{entry.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">Aucune entrée récente.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
