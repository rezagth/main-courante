'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type QuotaRow = {
  id: string;
  name: string;
  quotas: {
    maxActiveUsers: number;
    maxEntriesPerMonth: number;
    maxStorageGb: number;
  } | null;
};

type ApiKeyRow = {
  id: string;
  tenantId: string;
  label: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export function OperationsPanel() {
  const [quotas, setQuotas] = useState<QuotaRow[]>([]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [label, setLabel] = useState('API lecture externe');
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const [qRes, kRes] = await Promise.all([fetch('/api/admin/quotas'), fetch('/api/admin/api-keys')]);

    if (qRes.ok) {
      const payload = (await qRes.json()) as { data: QuotaRow[] };
      setQuotas(payload.data);
      if (!tenantId && payload.data.length > 0) {
        setTenantId(payload.data[0].id);
      }
    }

    if (kRes.ok) {
      const payload = (await kRes.json()) as { data: ApiKeyRow[] };
      setKeys(payload.data);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createApiKey() {
    if (!tenantId) return;
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, label }),
    });
    if (!res.ok) return;
    const payload = (await res.json()) as { plainTextKey: string };
    setCreatedPlainKey(payload.plainTextKey);
    await loadData();
  }

  const summary = useMemo(() => {
    const activeKeys = keys.filter((key) => key.isActive).length;
    const totalStorage = quotas.reduce((accumulator, row) => accumulator + (row.quotas?.maxStorageGb ?? 0), 0);
    return { activeKeys, totalStorage, tenantCount: quotas.length };
  }, [keys, quotas]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_45%),#111111] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Admin · Operations</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Centre de contrôle</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Supervision des quotas, lecture des clés API et pilotage des réglages tenant dans une vue unique.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
            onClick={loadData}
            disabled={isLoading}
          >
            {isLoading ? 'Chargement...' : 'Actualiser'}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="border-white/10 bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Tenants</p>
          <p className="mt-2 text-3xl font-semibold text-blue-300">{summary.tenantCount}</p>
          <p className="mt-1 text-xs text-zinc-500">Comptes suivis</p>
        </Card>
        <Card className="border-white/10 bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Clés actives</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{summary.activeKeys}</p>
          <p className="mt-1 text-xs text-zinc-500">API keys utilisables</p>
        </Card>
        <Card className="border-white/10 bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Stockage quota</p>
          <p className="mt-2 text-3xl font-semibold text-orange-300">{summary.totalStorage} Go</p>
          <p className="mt-1 text-xs text-zinc-500">Capacité cumulée</p>
        </Card>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4 border-white/10 bg-[#111111] p-5">
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Quotas par tenant</h2>
            <p className="text-xs text-zinc-500">Paramètres de capacité et de rétention</p>
          </div>

          <div className="space-y-3">
            {quotas.length ? (
              quotas.map((row) => (
                <article key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-100">{row.name}</p>
                    <Badge className="border-white/10 bg-white/5 text-zinc-300">Tenant</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-300 md:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-[#0f0f0f] p-3">
                      <p className="text-xs text-zinc-500">Utilisateurs</p>
                      <p className="mt-1 text-zinc-100">{row.quotas?.maxActiveUsers ?? '-'}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#0f0f0f] p-3">
                      <p className="text-xs text-zinc-500">Entrées/mois</p>
                      <p className="mt-1 text-zinc-100">{row.quotas?.maxEntriesPerMonth ?? '-'}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#0f0f0f] p-3">
                      <p className="text-xs text-zinc-500">Stockage</p>
                      <p className="mt-1 text-zinc-100">{row.quotas?.maxStorageGb ?? '-'} Go</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">Aucun quota trouvé.</div>
            )}
          </div>
        </Card>

        <Card className="space-y-4 border-white/10 bg-[#111111] p-5">
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Créer une clé API</h2>
            <p className="text-xs text-zinc-500">Clé lecture seule pour intégrations externes</p>
          </div>
          <div className="space-y-3">
            <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant ID" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label API key" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
            <Button onClick={createApiKey} className="w-full bg-orange-500 text-white hover:bg-orange-400">Créer la clé</Button>
          </div>

          {createdPlainKey ? (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-medium">Clé générée</p>
              <p className="mt-1 text-amber-100/80">Copie-la maintenant, elle ne sera plus affichée ensuite.</p>
              <code className="mt-3 block break-all rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white">{createdPlainKey}</code>
            </div>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.22em] text-zinc-500">Dernières clés</h3>
            <div className="space-y-2">
              {keys.length ? (
                keys.map((key) => (
                  <div key={key.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    <p className="font-medium text-zinc-100">{key.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">Tenant: {key.tenantId}</p>
                    <p className="text-xs text-zinc-500">Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-500">Aucune clé API pour le moment.</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
