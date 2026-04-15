'use client';

import { useEffect, useState } from 'react';
import { AnalyticsShell, MetricCard, MetricsGrid, NavChip, Panel } from './analytics-shell';

type AdminPayload = {
  totals: { tenants: number; entriesLast30Days: number };
  tenants: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    plan: string;
    lastActivityAt: string | null;
    activeUsers: number;
    last30DaysEntries: number;
    featureFlags: Array<{ key: string; enabled: boolean }>;
    quota: { maxActiveUsers: number; maxEntriesPerMonth: number; maxStorageGb: number } | null;
  }>;
  quotas: Array<{ tenantId: string; tenantName: string; activeUsers: number; entriesLast30Days: number; storageS3Mb: number }>;
};

export function AdminAnalyticsOverview() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/admin');
      if (response.ok) {
        setData((await response.json()) as AdminPayload);
      }
      setIsLoading(false);
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const topTenant = data?.tenants?.[0];

  return (
    <AnalyticsShell title="Analytics administration" subtitle="Vue globale des locataires, volumes, quotas et fonctions activées." actions={<NavChip href="/admin/analytics/tenants">Tenants</NavChip>}>
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-xs text-zinc-400">
        <span>{isLoading ? 'Mise à jour...' : 'Live admin'}</span>
        <NavChip href="/admin/analytics/quotas">Voir quotas</NavChip>
      </div>

      <MetricsGrid>
        <MetricCard label="Tenants" value={data?.totals.tenants ?? 0} detail="Locataires actifs" />
        <MetricCard label="Entrées 30j" value={data?.totals.entriesLast30Days ?? 0} detail="Volume global" accent="text-orange-300" />
        <MetricCard label="Locataire leader" value={topTenant?.name ?? 'N/A'} detail={topTenant ? `${topTenant.last30DaysEntries} entrées` : 'Aucune donnée'} accent="text-teal-400" />
        <MetricCard label="Plan dominant" value={topTenant?.plan ?? 'N/A'} detail="Dernière activité en tête" accent="text-indigo-400" />
      </MetricsGrid>

      <Panel title="Top tenants">
        <div className="space-y-2">
          {(data?.tenants ?? []).slice(0, 6).map((tenant) => (
            <article key={tenant.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-zinc-100">{tenant.name}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">{tenant.status}</span>
              </div>
              <p className="mt-1 text-zinc-400">{tenant.activeUsers} utilisateurs · {tenant.last30DaysEntries} entrées · {tenant.plan}</p>
            </article>
          ))}
        </div>
      </Panel>
    </AnalyticsShell>
  );
}
