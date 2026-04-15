'use client';

import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

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
  quotas: Array<{
    tenantId: string;
    tenantName: string;
    activeUsers: number;
    entriesLast30Days: number;
    storageS3Mb: number;
  }>;
};

const FLAG_ICONS: Record<string, string> = {
  offline: '📡', export: '📤', analytics: '📊',
  notifications: '🔔', api: '🔗', '2fa': '🔐',
};

function UsageBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  const danger = pct >= 90;
  const warn = pct >= 70;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
          {value} / {max}
        </span>
        <span style={{ fontSize: 10, color: danger ? 'var(--red)' : warn ? 'var(--amber)' : 'var(--muted2)' }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 2,
          background: danger ? 'var(--red)' : warn ? 'var(--amber)' : color,
          transition: 'width .6s ease',
          boxShadow: `0 0 6px ${danger ? 'var(--red)' : warn ? 'var(--amber)' : color}66`,
        }} />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border2)',
      borderRadius: 10, padding: '10px 14px',
      fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)',
      boxShadow: '0 8px 30px rgba(0,0,0,.5)',
    }}>
      <div style={{ color: 'var(--muted2)', marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div style={{ color: 'var(--accent)', fontWeight: 500 }}>{payload[0].value} entrées</div>
    </div>
  );
};

export function AdminDashboard() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    const res = await fetch('/api/dashboard/admin');
    if (!res.ok) return;
    setData((await res.json()) as AdminPayload);
  };

  useEffect(() => { load(); }, []);

  const toggleFlag = async (tenantId: string, key: string, enabled: boolean) => {
    await fetch('/api/dashboard/admin/feature-flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, key, enabled: !enabled }),
    });
    await load();
  };

  const updateQuota = async (
    tenantId: string,
    field: 'maxActiveUsers' | 'maxEntriesPerMonth' | 'maxStorageGb',
    value: number,
  ) => {
    await fetch('/api/admin/quotas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, [field]: value }),
    });
    await load();
  };

  const ACCENT_COLORS = ['#f97316', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .adm-root {
          --bg:       #0a0b0e;
          --surface:  #111318;
          --surface2: #16191f;
          --surface3: #1c2028;
          --border:   rgba(255,255,255,0.055);
          --border2:  rgba(255,255,255,0.10);
          --text:     #e8eaf0;
          --muted:    #3d4150;
          --muted2:   #6b7280;
          --accent:   #f97316;
          --red:      #ef4444;
          --amber:    #f59e0b;
          --green:    #10b981;
          --indigo:   #6366f1;
          --mono:     'JetBrains Mono', monospace;
          --display:  'Syne', sans-serif;

          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: var(--mono);
        }

        /* Header */
        .adm-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,11,14,0.9);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          padding: 14px 28px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .adm-logo {
          font-family: var(--display);
          font-size: 15px; font-weight: 800;
          letter-spacing: -0.02em;
          display: flex; align-items: center; gap: 8px;
        }
        .adm-logo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { box-shadow: 0 0 8px var(--accent); }
          50%      { box-shadow: 0 0 18px var(--accent); }
        }
        .adm-header-right {
          display: flex; align-items: center; gap: 12px;
        }
        .adm-clock {
          font-size: 11px; color: var(--muted2);
          letter-spacing: .07em;
        }
        .adm-badge-admin {
          font-size: 10px; padding: 3px 10px; border-radius: 20px;
          background: rgba(249,115,22,.1); color: var(--accent);
          border: 1px solid rgba(249,115,22,.25);
          letter-spacing: .07em; text-transform: uppercase;
        }
        .adm-reload {
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 8px; padding: 6px 12px;
          color: var(--muted2); font-family: var(--mono);
          font-size: 11px; cursor: pointer;
          transition: color .15s, border-color .15s;
          letter-spacing: .04em;
        }
        .adm-reload:hover { color: var(--text); border-color: var(--accent); }

        /* Layout */
        .adm-body { padding: 24px 28px; max-width: 1400px; margin: 0 auto; }

        /* Page title */
        .adm-page-title {
          font-family: var(--display);
          font-size: 28px; font-weight: 800;
          letter-spacing: -0.03em; margin-bottom: 6px;
        }
        .adm-page-title span { color: var(--accent); }
        .adm-page-sub {
          font-size: 12px; color: var(--muted2);
          letter-spacing: .03em; margin-bottom: 28px;
        }

        /* KPI grid */
        .adm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }
        .adm-kpi {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px; padding: 20px 22px;
          position: relative; overflow: hidden;
          transition: border-color .15s;
        }
        .adm-kpi:hover { border-color: var(--border2); }
        .adm-kpi::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--kpi-color, var(--accent)), transparent);
        }
        .adm-kpi-icon { font-size: 20px; margin-bottom: 10px; }
        .adm-kpi-value {
          font-family: var(--display); font-size: 36px; font-weight: 800;
          letter-spacing: -0.03em; color: var(--kpi-color, var(--accent));
          line-height: 1;
          text-shadow: 0 0 30px var(--kpi-color, var(--accent));
        }
        .adm-kpi-label {
          font-size: 11px; color: var(--muted2);
          letter-spacing: .07em; text-transform: uppercase;
          margin-top: 6px;
        }

        /* Section */
        .adm-section { margin-bottom: 24px; }
        .adm-section-title {
          font-family: var(--display); font-size: 13px; font-weight: 700;
          letter-spacing: .07em; text-transform: uppercase;
          color: var(--muted2); margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .adm-section-title::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }

        /* Chart card */
        .adm-chart-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px; padding: 22px 24px;
        }
        .adm-chart-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .adm-chart-title {
          font-family: var(--display); font-size: 15px; font-weight: 700;
          letter-spacing: -0.01em;
        }
        .adm-chart-sub { font-size: 11px; color: var(--muted2); margin-top: 2px; }
        .adm-chart-period {
          font-size: 10px; padding: 3px 10px; border-radius: 20px;
          background: var(--surface2); color: var(--muted2);
          border: 1px solid var(--border); letter-spacing: .05em;
        }

        /* Tenant table */
        .adm-tenant-list { display: flex; flex-direction: column; gap: 12px; }
        .adm-tenant {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px; overflow: hidden;
          transition: border-color .15s;
        }
        .adm-tenant:hover { border-color: var(--border2); }
        .adm-tenant-header {
          padding: 16px 20px;
          display: flex; align-items: center; gap: 14px;
          cursor: pointer; user-select: none;
        }
        .adm-tenant-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--display); font-size: 14px; font-weight: 800;
          flex-shrink: 0;
          background: rgba(249,115,22,.1);
          color: var(--accent);
          border: 1px solid rgba(249,115,22,.2);
        }
        .adm-tenant-info { flex: 1; min-width: 0; }
        .adm-tenant-name {
          font-family: var(--display); font-size: 15px; font-weight: 700;
          letter-spacing: -0.01em; color: var(--text);
        }
        .adm-tenant-meta {
          font-size: 11px; color: var(--muted2); margin-top: 3px;
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .adm-tenant-meta-dot { color: var(--muted); }
        .adm-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 20px; font-size: 10px;
          border: 1px solid; letter-spacing: .04em; font-family: var(--mono);
          white-space: nowrap;
        }
        .adm-pill-green  { background: rgba(16,185,129,.08); color: #10b981; border-color: rgba(16,185,129,.22); }
        .adm-pill-red    { background: rgba(239,68,68,.08);  color: #ef4444; border-color: rgba(239,68,68,.22); }
        .adm-pill-amber  { background: rgba(245,158,11,.08); color: #f59e0b; border-color: rgba(245,158,11,.22); }
        .adm-pill-gray   { background: rgba(255,255,255,.04); color: var(--muted2); border-color: var(--border2); }
        .adm-pill-accent { background: rgba(249,115,22,.08); color: var(--accent); border-color: rgba(249,115,22,.22); }
        .adm-entries-badge {
          font-family: var(--display); font-size: 20px; font-weight: 700;
          color: var(--accent); letter-spacing: -0.02em;
          text-align: right; flex-shrink: 0;
        }
        .adm-entries-badge-sub {
          font-size: 10px; color: var(--muted2); letter-spacing: .04em;
          text-align: right; font-family: var(--mono);
        }
        .adm-chevron {
          color: var(--muted2); font-size: 12px; flex-shrink: 0;
          transition: transform .2s;
        }
        .adm-chevron.open { transform: rotate(180deg); }

        /* Tenant body */
        .adm-tenant-body {
          border-top: 1px solid var(--border);
          padding: 18px 20px;
          display: none;
          background: var(--surface2);
        }
        .adm-tenant-body.open { display: block; }

        /* Feature flags */
        .adm-flags-row {
          display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
        }
        .adm-flag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px; font-size: 11px;
          border: 1px solid; cursor: pointer; font-family: var(--mono);
          transition: all .15s; letter-spacing: .03em;
          background: none;
        }
        .adm-flag-on {
          background: rgba(16,185,129,.1); color: #10b981;
          border-color: rgba(16,185,129,.3);
        }
        .adm-flag-on:hover { background: rgba(16,185,129,.18); }
        .adm-flag-off {
          background: var(--surface); color: var(--muted2);
          border-color: var(--border2);
        }
        .adm-flag-off:hover { border-color: var(--border2); color: var(--text); }
        .adm-flag-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: currentColor;
        }

        /* Quota grid */
        .adm-quota-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
        }
        @media (max-width: 600px) {
          .adm-quota-grid { grid-template-columns: 1fr; }
        }
        .adm-quota-block {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px;
        }
        .adm-quota-label {
          font-size: 10px; color: var(--muted2);
          letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px;
        }
        .adm-quota-input {
          width: 100%; padding: 9px 12px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text);
          font-family: var(--mono); font-size: 13px;
          outline: none; transition: border-color .15s, box-shadow .15s;
          margin-bottom: 10px;
        }
        .adm-quota-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(249,115,22,.1);
        }

        /* Loading */
        .adm-loading {
          display: flex; align-items: center; justify-content: center;
          min-height: 50vh; gap: 12px; color: var(--muted2); font-size: 13px;
        }
        .adm-spinner {
          width: 18px; height: 18px;
          border: 2px solid var(--border2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Recharts overrides */
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line { stroke: rgba(255,255,255,0.05) !important; }
        .recharts-text { fill: #6b7280 !important; font-family: 'JetBrains Mono', monospace !important; font-size: 11px !important; }
        .recharts-tooltip-cursor { fill: rgba(255,255,255,0.03) !important; }
      `}</style>

      <div className="adm-root">
        {/* Header */}
        <header className="adm-header">
          <div className="adm-logo">
            <div className="adm-logo-dot" />
            MC — INCENDIE
          </div>
          <div className="adm-header-right">
            <span className="adm-clock">
              {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="adm-badge-admin">⚙ Super Admin</span>
            <button className="adm-reload" onClick={load}>↻ Actualiser</button>
          </div>
        </header>

        {!data ? (
          <div className="adm-loading">
            <div className="adm-spinner" />
            Chargement des données…
          </div>
        ) : (
          <div className="adm-body">
            {/* Title */}
            <div>
              <h1 className="adm-page-title">Dashboard <span>Super Admin</span></h1>
              <p className="adm-page-sub">
                Vue globale SaaS — {now.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* KPIs */}
            <div className="adm-kpi-grid">
              {[
                { icon: '🏢', label: 'Tenants actifs', value: data.totals.tenants, color: '#f97316' },
                { icon: '📋', label: 'Entrées (30j)', value: data.totals.entriesLast30Days.toLocaleString('fr-FR'), color: '#6366f1' },
                { icon: '👥', label: 'Utilisateurs', value: data.tenants.reduce((s, t) => s + t.activeUsers, 0), color: '#10b981' },
                { icon: '⚡', label: 'Flags actifs', value: data.tenants.reduce((s, t) => s + t.featureFlags.filter((f) => f.enabled).length, 0), color: '#f59e0b' },
              ].map((kpi) => (
                <div key={kpi.label} className="adm-kpi" style={{ '--kpi-color': kpi.color } as React.CSSProperties}>
                  <div className="adm-kpi-icon">{kpi.icon}</div>
                  <div className="adm-kpi-value">{kpi.value}</div>
                  <div className="adm-kpi-label">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="adm-section">
              <div className="adm-section-title">Activité</div>
              <div className="adm-chart-card">
                <div className="adm-chart-header">
                  <div>
                    <div className="adm-chart-title">Entrées par tenant</div>
                    <div className="adm-chart-sub">Volume sur les 30 derniers jours</div>
                  </div>
                  <span className="adm-chart-period">30 JOURS</span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.quotas} barSize={32} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tenantName" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Bar dataKey="entriesLast30Days" radius={[6, 6, 0, 0]}>
                      {data.quotas.map((_, i) => (
                        <Cell key={i} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tenants */}
            <div className="adm-section">
              <div className="adm-section-title">Tenants — Quotas & Feature flags</div>
              <div className="adm-tenant-list">
                {data.tenants.map((tenant, i) => {
                  const isOpen = expanded === tenant.id;
                  const statusOk = tenant.status === 'ACTIVE' || tenant.status === 'active';
                  const quotaData = data.quotas.find((q) => q.tenantId === tenant.id);

                  return (
                    <div key={tenant.id} className="adm-tenant">
                      {/* Header row */}
                      <div
                        className="adm-tenant-header"
                        onClick={() => setExpanded(isOpen ? null : tenant.id)}
                      >
                        <div
                          className="adm-tenant-avatar"
                          style={{
                            background: `${ACCENT_COLORS[i % ACCENT_COLORS.length]}18`,
                            color: ACCENT_COLORS[i % ACCENT_COLORS.length],
                            borderColor: `${ACCENT_COLORS[i % ACCENT_COLORS.length]}33`,
                          }}
                        >
                          {tenant.name.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="adm-tenant-info">
                          <div className="adm-tenant-name">{tenant.name}</div>
                          <div className="adm-tenant-meta">
                            <span className={`adm-pill ${statusOk ? 'adm-pill-green' : 'adm-pill-red'}`}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                              {statusOk ? 'Actif' : tenant.status}
                            </span>
                            <span className="adm-pill adm-pill-gray">Plan {tenant.plan}</span>
                            <span className="adm-pill adm-pill-gray">
                              {tenant.activeUsers} users
                            </span>
                            {tenant.lastActivityAt && (
                              <span style={{ fontSize: 10, color: 'var(--muted2)' }}>
                                Dernière activité {new Date(tenant.lastActivityAt).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="adm-entries-badge">{tenant.last30DaysEntries.toLocaleString('fr-FR')}</div>
                          <div className="adm-entries-badge-sub">entrées / 30j</div>
                        </div>

                        <span className={`adm-chevron ${isOpen ? 'open' : ''}`}>▼</span>
                      </div>

                      {/* Expandable body */}
                      <div className={`adm-tenant-body ${isOpen ? 'open' : ''}`}>
                        {/* Feature flags */}
                        <div style={{ marginBottom: 18 }}>
                          <div style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                            Feature flags
                          </div>
                          <div className="adm-flags-row">
                            {tenant.featureFlags.length === 0 ? (
                              <span className="adm-pill adm-pill-gray">Aucun flag configuré</span>
                            ) : (
                              tenant.featureFlags.map((flag) => (
                                <button
                                  key={flag.key}
                                  className={`adm-flag ${flag.enabled ? 'adm-flag-on' : 'adm-flag-off'}`}
                                  onClick={() => toggleFlag(tenant.id, flag.key, flag.enabled)}
                                >
                                  <span className="adm-flag-dot" />
                                  {FLAG_ICONS[flag.key] ?? '🔧'} {flag.key}
                                  <span style={{ opacity: .6, fontSize: 10 }}>{flag.enabled ? 'ON' : 'OFF'}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Quotas */}
                        <div style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                          Quotas
                        </div>
                        <div className="adm-quota-grid">
                          {[
                            {
                              label: 'Utilisateurs max',
                              field: 'maxActiveUsers' as const,
                              default: tenant.quota?.maxActiveUsers ?? 25,
                              current: quotaData?.activeUsers ?? 0,
                              icon: '👥',
                              color: '#6366f1',
                            },
                            {
                              label: 'Entrées / mois',
                              field: 'maxEntriesPerMonth' as const,
                              default: tenant.quota?.maxEntriesPerMonth ?? 10000,
                              current: quotaData?.entriesLast30Days ?? 0,
                              icon: '📋',
                              color: '#f97316',
                            },
                            {
                              label: 'Stockage (Go)',
                              field: 'maxStorageGb' as const,
                              default: tenant.quota?.maxStorageGb ?? 20,
                              current: quotaData ? Math.round(quotaData.storageS3Mb / 1024) : 0,
                              icon: '💾',
                              color: '#10b981',
                            },
                          ].map((q) => (
                            <div key={q.field} className="adm-quota-block">
                              <div className="adm-quota-label">{q.icon} {q.label}</div>
                              <UsageBar value={q.current} max={q.default} color={q.color} />
                              <div style={{ marginTop: 10 }}>
                                <input
                                  type="number"
                                  defaultValue={q.default}
                                  className="adm-quota-input"
                                  onBlur={(e) => updateQuota(tenant.id, q.field, Number(e.target.value))}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}