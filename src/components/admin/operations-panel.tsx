'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  async function loadData() {
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Operations Admin</h1>

      <Card className="space-y-2">
        <h2 className="font-medium">Quotas par tenant</h2>
        <div className="space-y-2">
          {quotas.map((row) => (
            <article key={row.id} className="rounded border p-3">
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-zinc-600">
                Users: {row.quotas?.maxActiveUsers ?? '-'} / Mois: {row.quotas?.maxEntriesPerMonth ?? '-'} /
                Stockage: {row.quotas?.maxStorageGb ?? '-'} Go
              </p>
            </article>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">API key externe (lecture seule)</h2>
        <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant ID" />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label API key" />
        <Button onClick={createApiKey}>Creer une API key</Button>
        {createdPlainKey ? (
          <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">
            Cle generee (copie-la maintenant) : <code>{createdPlainKey}</code>
          </p>
        ) : null}
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="rounded border p-2 text-sm">
              <p>{key.label}</p>
              <p className="text-zinc-500">
                Tenant: {key.tenantId} - Last used:{' '}
                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
