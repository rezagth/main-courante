'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type Row = {
  id: string;
  timestamp: string;
  description: string;
  gravite?: string | null;
  site: { name: string };
  user: { firstName: string; lastName: string };
  typeEvenement: { label: string };
};

type Payload = {
  rows: Row[];
  total: number;
  nextPage: number | null;
  bySite: Array<{ label: string; count: number }>;
  byType: Array<{ label: string; count: number }>;
  byAgent: Array<{ label: string; count: number }>;
  trend: Array<{ timestamp: string }>;
  heatmap: Array<{ day: number; hour: number; count: number }>;
};

const col = createColumnHelper<Row>();

export function ClientDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [page, setPage] = useState(0);
  const [days, setDays] = useState('30');
  const [query, setQuery] = useState('');
  const [gravite, setGravite] = useState('');

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('take', '20');
    params.set('days', days);
    if (query) params.set('q', query);
    if (gravite) params.set('gravite', gravite);
    return params.toString();
  }, [days, gravite, page, query]);

  useEffect(() => {
    fetch(`/api/dashboard/client?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => payload && setData(payload as Payload));
  }, [qs]);

  const columns = useMemo(
    () => [
      col.accessor('timestamp', { header: 'Date', cell: (info) => new Date(info.getValue()).toLocaleString() }),
      col.accessor('typeEvenement.label', { header: 'Type' }),
      col.accessor('description', { header: 'Description' }),
      col.accessor('site.name', { header: 'Site' }),
      col.accessor((row) => `${row.user.firstName} ${row.user.lastName}`.trim(), { id: 'agent', header: 'Agent' }),
      col.accessor('gravite', { header: 'Gravite' }),
    ],
    [],
  );

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    (data?.trend ?? []).forEach((point) => {
      const day = new Date(point.timestamp).toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([day, count]) => ({ day, count }));
  }, [data?.trend]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Dashboard Client (lecture seule)</h1>

      <Card className="grid gap-2 md:grid-cols-4">
        <Select value={days} onChange={(e) => { setDays(e.target.value); setPage(0); }}>
          <option value="7">7 jours</option>
          <option value="30">30 jours</option>
          <option value="90">90 jours</option>
        </Select>
        <Input placeholder="Recherche full-text" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
        <Select value={gravite} onChange={(e) => { setGravite(e.target.value); setPage(0); }}>
          <option value="">Toutes gravites</option>
          <option value="FAIBLE">Faible</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="ELEVEE">Elevee</option>
        </Select>
        <div className="flex gap-2">
          <a className="flex-1" href={`/api/dashboard/client/export/csv?${qs}`}>
            <Button className="w-full" variant="outline">Export CSV</Button>
          </a>
          <a className="flex-1" href={`/api/dashboard/client/export/pdf?${qs}`}>
            <Button className="w-full" variant="outline">Export PDF</Button>
          </a>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="h-72">
          <p className="mb-2 text-sm text-zinc-500">Tendance temporelle</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="h-72">
          <p className="mb-2 text-sm text-zinc-500">Volume par site</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.bySite ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <p className="mb-2 text-sm text-zinc-500">Heatmap activite (heure x jour)</p>
        <div className="grid grid-cols-12 gap-1">
          {(data?.heatmap ?? []).slice(0, 12 * 7).map((cell, idx) => (
            <div
              key={idx}
              title={`jour ${cell.day} heure ${cell.hour}: ${cell.count}`}
              className="h-4 rounded"
              style={{ background: `rgba(14,165,233,${Math.min(0.15 + cell.count / 20, 1)})` }}
            />
          ))}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="border-b px-2 py-2 text-left">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b px-2 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Total: {data?.total ?? 0}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
              Precedent
            </Button>
            <Button variant="outline" onClick={() => data?.nextPage !== null && setPage(data.nextPage)} disabled={data?.nextPage === null}>
              Suivant
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
