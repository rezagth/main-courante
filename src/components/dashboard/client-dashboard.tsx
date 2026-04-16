'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
} from '@tanstack/react-table';

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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  .db-root {
    --bg:  #0c0d10;
    --s1:  #13151a;
    --s2:  #191c23;
    --s3:  #1e222b;
    --b1:  rgba(255,255,255,0.05);
    --b2:  rgba(255,255,255,0.09);
    --b3:  rgba(255,255,255,0.14);
    --tx:  #eceef2;
    --tm:  #8891a4;
    --ts:  #4e5668;
    --acc: #f97316;
    --acc2:#fb923c;
    --teal:#14b8a6;
    --ind: #818cf8;
    --red: #f87171;
    --amb: #fbbf24;
    --font:'Inter', sans-serif;
    --mono:'JetBrains Mono', monospace;
    min-height: 100vh;
    background: var(--bg);
    color: var(--tx);
    font-family: var(--font);
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Topbar ── */
  .db-topbar {
    position: sticky; top: 0; z-index: 40;
    background: rgba(12,13,16,0.85);
    backdrop-filter: blur(20px) saturate(1.4);
    border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; height: 54px;
  }
  .db-logo {
    font-family: var(--mono); font-size: 12px; font-weight: 500;
    letter-spacing: .12em; color: var(--tm); text-transform: uppercase;
    display: flex; align-items: center; gap: 10px;
  }
  .db-logo-mark {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--acc);
    box-shadow: 0 0 0 3px rgba(249,115,22,.18);
    animation: pulse-ring 2.5s ease-in-out infinite;
  }
  @keyframes pulse-ring {
    0%,100% { box-shadow: 0 0 0 3px rgba(249,115,22,.18); }
    50%      { box-shadow: 0 0 0 5px rgba(249,115,22,.08); }
  }
  .db-topbar-right { display: flex; align-items: center; gap: 8px; }
  .db-chip {
    font-family: var(--mono); font-size: 10px; letter-spacing: .08em;
    padding: 4px 10px; border-radius: 6px;
    border: 1px solid var(--b2); color: var(--tm);
    background: var(--s2);
  }
  .db-chip-accent {
    background: rgba(249,115,22,.1);
    border-color: rgba(249,115,22,.2);
    color: var(--acc2);
  }

  /* ── Layout ── */
  .db-wrap { max-width: 1280px; margin: 0 auto; padding: 28px; }

  .db-page-title {
    font-family: var(--font); font-size: 22px; font-weight: 600;
    letter-spacing: -.02em; color: var(--tx); margin: 0 0 4px;
  }
  .db-page-title span { color: var(--acc); }
  .db-page-sub {
    font-family: var(--mono); font-size: 11px;
    color: var(--ts); letter-spacing: .05em; margin-bottom: 28px;
  }

  /* ── Toolbar ── */
  .db-toolbar {
    display: grid; grid-template-columns: 1fr 1fr 1fr auto;
    gap: 10px; margin-bottom: 24px;
    background: var(--s1); border: 1px solid var(--b1);
    border-radius: 14px; padding: 14px 16px;
  }
  .db-select, .db-input {
    background: var(--s2); border: 1px solid var(--b2);
    border-radius: 8px; color: var(--tx);
    font-family: var(--mono); font-size: 12px;
    padding: 8px 12px; outline: none;
    transition: border-color .15s;
    appearance: none; -webkit-appearance: none;
    width: 100%;
  }
  .db-select:focus, .db-input:focus { border-color: var(--acc); }
  .db-input::placeholder { color: var(--ts); }
  .db-export-row { display: flex; gap: 8px; }
  .db-btn {
    flex: 1; padding: 8px 14px; border-radius: 8px;
    font-family: var(--mono); font-size: 11px; letter-spacing: .06em;
    cursor: pointer; border: 1px solid var(--b2);
    background: var(--s2); color: var(--tm);
    transition: all .15s; display: flex;
    align-items: center; gap: 6px; justify-content: center;
  }
  .db-btn:hover { border-color: var(--b3); color: var(--tx); background: var(--s3); }

  /* ── Cards ── */
  .db-card {
    background: var(--s1); border: 1px solid var(--b1);
    border-radius: 14px; padding: 20px 22px;
    transition: border-color .2s;
  }
  .db-card:hover { border-color: var(--b2); }
  .db-card-label {
    font-family: var(--mono); font-size: 10px;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--ts); margin-bottom: 14px;
    display: flex; align-items: center; gap: 6px;
  }
  .db-card-label::before {
    content: ''; width: 4px; height: 4px;
    border-radius: 50%; background: var(--acc); flex-shrink: 0;
  }
  .db-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

  /* ── Heatmap ── */
  .db-heatmap-grid {
    display: grid; grid-template-columns: repeat(12, 1fr);
    gap: 4px; margin-top: 4px;
  }
  .db-heatmap-cell {
    height: 18px; border-radius: 4px;
  }

  /* ── Table ── */
  .db-table-card {
    background: var(--s1); border: 1px solid var(--b1);
    border-radius: 14px; overflow: hidden;
  }
  .db-table-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 22px; border-bottom: 1px solid var(--b1);
  }
  .db-table-title { font-size: 13px; font-weight: 500; color: var(--tx); }
  .db-total-badge {
    font-family: var(--mono); font-size: 10px; letter-spacing: .06em;
    padding: 3px 10px; border-radius: 6px;
    background: var(--s2); border: 1px solid var(--b2); color: var(--tm);
  }
  .db-table-scroll { overflow-x: auto; }
  table.db-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.db-tbl th {
    font-family: var(--mono); font-size: 10px; letter-spacing: .08em;
    text-transform: uppercase; color: var(--ts);
    padding: 11px 22px; text-align: left; font-weight: 400;
    border-bottom: 1px solid var(--b2);
  }
  table.db-tbl td {
    padding: 11px 22px; border-bottom: 1px solid var(--b1); color: var(--tx);
  }
  table.db-tbl tbody tr:last-child td { border-bottom: none; }
  table.db-tbl tbody tr:hover td { background: rgba(255,255,255,.015); }
  .db-ts { font-family: var(--mono); font-size: 12px; color: var(--tm); }

  /* ── Gravité pills ── */
  .db-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 5px;
    font-family: var(--mono); font-size: 10px;
    letter-spacing: .05em; border: 1px solid;
  }
  .db-pill::before {
    content: ''; width: 4px; height: 4px;
    border-radius: 50%; background: currentColor; flex-shrink: 0;
  }
  .db-pill-h { background: rgba(248,113,113,.08); color: #f87171; border-color: rgba(248,113,113,.2); }
  .db-pill-m { background: rgba(251,191,36,.08);  color: #fbbf24; border-color: rgba(251,191,36,.2); }
  .db-pill-l { background: rgba(20,184,166,.08);  color: #14b8a6; border-color: rgba(20,184,166,.2); }
  .db-pill-n { background: var(--s2); color: var(--tm); border-color: var(--b2); }

  /* ── Pagination ── */
  .db-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 22px; border-top: 1px solid var(--b1);
  }
  .db-pg-info { font-family: var(--mono); font-size: 11px; color: var(--ts); }
  .db-pg-btns { display: flex; gap: 8px; }
  .db-pg-btn {
    font-family: var(--mono); font-size: 11px; padding: 6px 14px;
    border-radius: 7px; border: 1px solid var(--b2);
    background: var(--s2); color: var(--tm); cursor: pointer;
    transition: all .15s;
  }
  .db-pg-btn:hover:not(:disabled) { color: var(--tx); border-color: var(--b3); }
  .db-pg-btn:disabled { opacity: .3; pointer-events: none; }

  /* Recharts overrides */
  .recharts-cartesian-grid-horizontal line,
  .recharts-cartesian-grid-vertical line { stroke: rgba(255,255,255,0.04) !important; }
  .recharts-text { fill: #4e5668 !important; font-family: 'JetBrains Mono', monospace !important; font-size: 11px !important; }
  .recharts-tooltip-cursor { fill: rgba(255,255,255,0.025) !important; }

  @media (max-width: 768px) {
    .db-charts { grid-template-columns: 1fr; }
    .db-toolbar { grid-template-columns: 1fr 1fr; }
  }
`;

function GravitePill({ value }: { value?: string | null }) {
  if (!value) return <span className="db-pill db-pill-n">—</span>;
  const map: Record<string, string> = { ELEVEE: 'db-pill-h', MOYENNE: 'db-pill-m', FAIBLE: 'db-pill-l' };
  return <span className={`db-pill ${map[value] ?? 'db-pill-n'}`}>{value}</span>;
}

export function ClientDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [page, setPage] = useState(0);
  const [days, setDays] = useState('30');
  const [query, setQuery] = useState('');
  const [gravite, setGravite] = useState('');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page)); p.set('take', '20'); p.set('days', days);
    if (query) p.set('q', query);
    if (gravite) p.set('gravite', gravite);
    return p.toString();
  }, [days, gravite, page, query]);

  useEffect(() => {
    fetch(`/api/dashboard/client?${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(payload => payload && setData(payload as Payload));
  }, [qs]);

  const columns = useMemo(() => [
    col.accessor('timestamp', {
      header: 'Date',
      cell: info => <span className="db-ts">{new Date(info.getValue()).toLocaleString('fr-FR')}</span>,
    }),
    col.accessor('typeEvenement.label', { header: 'Type' }),
    col.accessor('description', { header: 'Description' }),
    col.accessor('site.name', { header: 'Site' }),
    col.accessor(row => `${row.user.firstName} ${row.user.lastName}`.trim(), { id: 'agent', header: 'Agent' }),
    col.accessor('gravite', { header: 'Gravité', cell: info => <GravitePill value={info.getValue()} /> }),
  ], []);

  const table = useReactTable({ data: data?.rows ?? [], columns, getCoreRowModel: getCoreRowModel() });

  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    (data?.trend ?? []).forEach(p => {
      const day = new Date(p.timestamp).toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([day, count]) => ({ day, count }));
  }, [data?.trend]);
  const nextPage = data?.nextPage;

  return (
    <>
      <style>{css}</style>
      <div className="db-root">
        <header className="db-topbar">
          <div className="db-logo">
            <div className="db-logo-mark" />
            MC — Incendie
          </div>
          <div className="db-topbar-right">
            <span className="db-chip">lecture seule</span>
            <span className="db-chip db-chip-accent">Dashboard Client</span>
          </div>
        </header>

        <div className="db-wrap">
          <h1 className="db-page-title">Tableau de bord <span>client</span></h1>
          <p className="db-page-sub">VUE ANALYTIQUE — LECTURE SEULE</p>

          {/* Toolbar */}
          <div className="db-toolbar">
            <select className="db-select" value={days} onChange={e => { setDays(e.target.value); setPage(0); }}>
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
            </select>
            <input
              className="db-input" placeholder="Recherche full-text…"
              value={query} onChange={e => { setQuery(e.target.value); setPage(0); }}
            />
            <select className="db-select" value={gravite} onChange={e => { setGravite(e.target.value); setPage(0); }}>
              <option value="">Toutes gravités</option>
              <option value="FAIBLE">Faible</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="ELEVEE">Élevée</option>
            </select>
            <div className="db-export-row">
              <a href={`/api/dashboard/client/export/csv?${qs}`} style={{ flex: 1 }}>
                <button className="db-btn">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v7M3 5.5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  CSV
                </button>
              </a>
              <a href={`/api/dashboard/client/export/pdf?${qs}`} style={{ flex: 1 }}>
                <button className="db-btn">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v7M3 5.5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  PDF
                </button>
              </a>
            </div>
          </div>

          {/* Charts */}
          <div className="db-charts">
            <div className="db-card" style={{ height: 260 }}>
              <div className="db-card-label">Tendance temporelle</div>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#191c23', border: '1px solid rgba(255,255,255,0.09)',
                      borderRadius: 10, fontFamily: 'JetBrains Mono', fontSize: 12,
                    }}
                    labelStyle={{ color: '#8891a4', marginBottom: 4 }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Line
                    type="monotone" dataKey="count" stroke="#f97316"
                    strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#f97316' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="db-card" style={{ height: 260 }}>
              <div className="db-card-label">Volume par site</div>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data?.bySite ?? []} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#191c23', border: '1px solid rgba(255,255,255,0.09)',
                      borderRadius: 10, fontFamily: 'JetBrains Mono', fontSize: 12,
                    }}
                    labelStyle={{ color: '#8891a4', marginBottom: 4 }}
                    itemStyle={{ color: '#14b8a6' }}
                  />
                  <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]}
                    style={{ opacity: 0.85 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Heatmap */}
          <div className="db-card" style={{ marginBottom: 16 }}>
            <div className="db-card-label">Activité horaire — heatmap</div>
            <div className="db-heatmap-grid">
              {(data?.heatmap ?? []).slice(0, 84).map((cell, idx) => (
                <div
                  key={idx}
                  className="db-heatmap-cell"
                  title={`Jour ${cell.day} — ${cell.hour}h : ${cell.count}`}
                  style={{ background: `rgba(249,115,22,${Math.min(0.1 + cell.count / 20, 1)})` }}
                />
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="db-table-card">
            <div className="db-table-topbar">
              <span className="db-table-title">Événements récents</span>
              <span className="db-total-badge">Total : {data?.total ?? 0}</span>
            </div>
            <div className="db-table-scroll">
              <table className="db-tbl">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(h => (
                        <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="db-pagination">
              <span className="db-pg-info">Page {page + 1}</span>
              <div className="db-pg-btns">
                <button className="db-pg-btn" onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}>
                  ← Précédent
                </button>
                <button
                  className="db-pg-btn"
                  onClick={() => {
                    if (typeof nextPage === 'number') setPage(nextPage);
                  }}
                  disabled={nextPage === null || nextPage === undefined}
                >
                  Suivant →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}