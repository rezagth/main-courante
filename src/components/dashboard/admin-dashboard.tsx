'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
    quota: {
      maxActiveUsers: number;
      maxEntriesPerMonth: number;
      maxStorageGb: number;
    } | null;
  }>;
  quotas: Array<{ tenantId: string; tenantName: string; activeUsers: number; entriesLast30Days: number; storageS3Mb: number }>;
};

export function AdminDashboard() {
  const [data, setData] = useState<AdminPayload | null>(null);

  const load = async () => {
    const res = await fetch('/api/dashboard/admin');
    if (!res.ok) return;
    setData((await res.json()) as AdminPayload);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleFlag = async (tenantId: string, key: string, enabled: boolean) => {
    await fetch('/api/dashboard/admin/feature-flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, key, enabled: !enabled }),
    });
    await load();
  };

  const updateQuota = async (tenantId: string, field: 'maxActiveUsers' | 'maxEntriesPerMonth' | 'maxStorageGb', value: number) => {
    await fetch('/api/admin/quotas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, [field]: value }),
    });
    await load();
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Dashboard Super Admin</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-zinc-500">Tenants</p>
          <p className="text-3xl font-bold">{data?.totals.tenants ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Entrees (30j)</p>
          <p className="text-3xl font-bold">{data?.totals.entriesLast30Days ?? 0}</p>
        </Card>
      </div>

      <Card className="h-72">
        <p className="mb-2 text-sm text-zinc-500">Entrees par tenant (30 derniers jours)</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.quotas ?? []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tenantName" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="entriesLast30Days" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Monitoring quotas + feature flags</h2>
        <div className="space-y-3">
          {data?.tenants.map((tenant) => (
            <article key={tenant.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-xs text-zinc-500">
                    Plan {tenant.plan} - Statut {tenant.status} - Derniere activite{' '}
                    {tenant.lastActivityAt ? new Date(tenant.lastActivityAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <Badge>{tenant.last30DaysEntries} entrees / 30j</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {tenant.featureFlags.length === 0 ? <Badge>Aucun flag</Badge> : null}
                {tenant.featureFlags.map((flag) => (
                  <Button
                    key={flag.key}
                    size="sm"
                    variant={flag.enabled ? 'default' : 'outline'}
                    onClick={() => toggleFlag(tenant.id, flag.key, flag.enabled)}
                  >
                    {flag.key}: {flag.enabled ? 'ON' : 'OFF'}
                  </Button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <label className="text-xs">
                  Quota users
                  <input
                    type="number"
                    defaultValue={tenant.quota?.maxActiveUsers ?? 25}
                    className="mt-1 w-full rounded border px-2 py-1"
                    onBlur={(e) => updateQuota(tenant.id, 'maxActiveUsers', Number(e.target.value))}
                  />
                </label>
                <label className="text-xs">
                  Quota entrees/mois
                  <input
                    type="number"
                    defaultValue={tenant.quota?.maxEntriesPerMonth ?? 10000}
                    className="mt-1 w-full rounded border px-2 py-1"
                    onBlur={(e) => updateQuota(tenant.id, 'maxEntriesPerMonth', Number(e.target.value))}
                  />
                </label>
                <label className="text-xs">
                  Quota stockage (Go)
                  <input
                    type="number"
                    defaultValue={tenant.quota?.maxStorageGb ?? 20}
                    className="mt-1 w-full rounded border px-2 py-1"
                    onBlur={(e) => updateQuota(tenant.id, 'maxStorageGb', Number(e.target.value))}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </main>
  );
}
