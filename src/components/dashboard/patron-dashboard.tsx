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
      {
        label: 'Mes hôpitaux clients',
        value: data?.totals.tenants ?? 0,
        hint: 'Les établissements gérés',
      },
      {
        label: 'Mes endroits',
        value: data?.totals.sites ?? 0,
        hint: 'Parking, entrées, urgences',
      },
      {
        label: 'Mes agents',
        value: data?.totals.users ?? 0,
        hint: 'Agents actifs',
      },
      {
        label: 'Entrées du mois',
        value: data?.totals.entriesLast30Days ?? 0,
        hint: '30 derniers jours',
      },
    ],
    [data],
  );

  const recentEntries = (data?.recentEntries ?? []).slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_45%),#111111] p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Patron · Pilotage</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Tableau de bord simple</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Tout est ici: vos hôpitaux, vos endroits, vos agents et les dernières entrées.
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Link href="/patron/hopitaux" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20">
            1. Gérer mes hôpitaux et endroits
          </Link>
          <Link href="/patron/personnel" className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-100 hover:bg-blue-500/20">
            2. Affecter mes agents
          </Link>
          <Link href="/patron/entrees" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/10">
            3. Suivre les entrées
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-xl border border-white/10 bg-[#111111] p-4">
            <p className="text-xs text-zinc-400">{kpi.label}</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-100">{kpi.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{kpi.hint}</p>
          </article>
        ))}
      </section>

      <article className="rounded-xl border border-white/10 bg-[#111111] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-100">Dernières entrées (simple)</h2>
          <button onClick={load} className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10" type="button">
            Actualiser
          </button>
        </div>

        {loading && !data ? <p className="text-sm text-zinc-500">Chargement...</p> : null}

        <div className="space-y-2">
          {recentEntries.length ? (
            recentEntries.map((entry) => (
              <Link key={entry.id} href={`/entries/${entry.id}`} className="block rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05]">
                <p className="font-medium text-zinc-100">{entry.agentName} a créé une entrée</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(entry.timestamp).toLocaleString()} · {entry.tenantName} · Hôpital {entry.siteName}</p>
                <p className="mt-1 text-xs text-zinc-400">Type: {entry.typeLabel}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-300">{entry.description}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-zinc-500">Aucune entrée récente.</p>
          )}
        </div>
      </article>
    </main>
  );
}
