'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';

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

const COLORS = ['#378ADD', '#1D9E75', '#BA7517', '#A32D2D', '#7F77DD'];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'currentColor',
        opacity: 0.7,
        marginRight: 4,
      }}
    />
  );
}

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'live' | 'alert' | 'normal' | 'count';
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: 'var(--color-background-secondary)',
      color: 'var(--color-text-secondary)',
      border: '0.5px solid var(--color-border-tertiary)',
    },
    live: {
      background: 'var(--color-background-success)',
      color: 'var(--color-text-success)',
      border: '0.5px solid var(--color-border-success)',
    },
    alert: {
      background: 'var(--color-background-danger)',
      color: 'var(--color-text-danger)',
      border: '0.5px solid var(--color-border-danger)',
    },
    normal: {
      background: 'var(--color-background-secondary)',
      color: 'var(--color-text-secondary)',
      border: '0.5px solid var(--color-border-tertiary)',
    },
    count: {
      background: 'var(--color-background-secondary)',
      color: 'var(--color-text-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      fontSize: 12,
      padding: '2px 8px',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: '3px 10px',
        borderRadius: 20,
        letterSpacing: '0.02em',
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1rem 1.25rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string | number;
  sub: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-md)',
        padding: '1rem',
        flex: 1,
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: typeof value === 'number' && value > 99 ? 22 : 18,
          fontWeight: 500,
          color: valueColor ?? 'var(--color-text-primary)',
          lineHeight: 1.15,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{sub}</p>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'var(--color-background-info)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-text-info)',
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</p>
      {sub && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{sub}</p>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{ height: '0.5px', background: 'var(--color-border-tertiary)', margin: '0 -1.25rem' }}
    />
  );
}

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

  const summary = useMemo(() => {
    const topType = [...(data?.byType ?? [])].sort((a, b) => b.count - a.count)[0];
    const topAgent = [...(data?.byAgent ?? [])].sort((a, b) => b.count - a.count)[0];
    const latestEntry = data?.recent?.[0];
    return { topType, topAgent, latestEntry };
  }, [data]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const res = await fetch(`/api/dashboard/chef?${query}`);
      if (res.ok) setData((await res.json()) as ChefPayload);
      setIsLoading(false);
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [query]);

  const totalByType = (data?.byType ?? []).reduce((acc, t) => acc + t.count, 0);

  return (
    <main
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 4,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Chef d'équipe
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.2 }}>
            Dashboard de supervision
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              marginTop: 5,
              lineHeight: 1.5,
              maxWidth: 480,
            }}
          >
            Contrôle des entrées terrain, agents actifs et alertes d'inactivité.
          </p>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}
        >
          <Badge variant={isLoading ? 'default' : 'live'}>
            <StatusDot active={!isLoading} />
            {isLoading
              ? 'Mise à jour...'
              : `Live · ${data?.refreshedAt ? formatTime(data.refreshedAt) : '--:--'}`}
          </Badge>
          <Badge variant={data?.noEntryAlert ? 'alert' : 'normal'}>
            {data?.noEntryAlert ? 'Alerte inactivité' : 'Flux normal'}
          </Badge>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card style={{ padding: '14px 16px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          {[
            {
              label: 'Début',
              el: (
                <input
                  type="datetime-local"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              label: 'Fin',
              el: (
                <input
                  type="datetime-local"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              label: 'Type',
              el: (
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Tous les types</option>
                  {data?.typeOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              label: 'Agent',
              el: (
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Tous les agents</option>
                  {data?.agentOptions.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.agentName}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              label: 'Alerte (min)',
              narrow: true,
              el: (
                <input
                  type="number"
                  min={5}
                  value={inactivityMinutes}
                  onChange={(e) => setInactivityMinutes(e.target.value)}
                  style={{ width: '100%' }}
                />
              ),
            },
          ].map(({ label, el, narrow }) => (
            <div
              key={label}
              style={{ display: 'flex', flexDirection: 'column', flex: narrow ? '0 0 130px' : 1, minWidth: 130 }}
            >
              <label
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 4,
                  letterSpacing: '0.03em',
                }}
              >
                {label}
              </label>
              {el}
            </div>
          ))}

          <button
            type="button"
            style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap', fontSize: 12 }}
            onClick={() => {
              setFrom('');
              setTo('');
              setTypeId('');
              setAgentId('');
              setInactivityMinutes('30');
            }}
          >
            Réinitialiser
          </button>
        </div>
      </Card>

      {/* ── Alert bar ── */}
      {data?.noEntryAlert && (
        <div
          style={{
            background: 'var(--color-background-danger)',
            border: '0.5px solid var(--color-border-danger)',
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            color: 'var(--color-text-danger)',
            fontSize: 13,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path
              d="M8 2L14 13H2L8 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M8 7V9.5M8 11V11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <p style={{ fontWeight: 500, marginBottom: 2 }}>Aucune entrée récente détectée</p>
            <p style={{ fontSize: 12, opacity: 0.8 }}>
              Vérifie les agents en tournée ou ajuste le seuil d'inactivité.
            </p>
          </div>
        </div>
      )}

      {/* ── Metrics ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <MetricCard
          label="Volume aujourd'hui"
          value={data?.volumeToday ?? 0}
          sub="entrées enregistrées"
          valueColor="#378ADD"
        />
        <MetricCard
          label="Type dominant"
          value={summary.topType?.label ?? 'N/A'}
          sub={`${summary.topType?.count ?? 0} occurrences`}
        />
        <MetricCard
          label="Agent leader"
          value={summary.topAgent?.agentName ?? 'N/A'}
          sub={`${summary.topAgent?.count ?? 0} entrées`}
        />
        <MetricCard
          label="Dernière entrée"
          value={summary.latestEntry ? formatTime(summary.latestEntry.timestamp) : '--:--'}
          sub={summary.latestEntry?.description ?? 'Aucune entrée'}
        />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 12 }}>
        {/* Donut */}
        <Card>
          <SectionHeader
            title="Répartition par type"
            sub="Nature des événements sur la période"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 180, height: 180, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.byType ?? []}
                    dataKey="count"
                    nameKey="label"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(data?.byType ?? []).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-background-primary)',
                      border: '0.5px solid var(--color-border-tertiary)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.byType ?? []).map((t, idx) => {
                const pct = totalByType > 0 ? Math.round((t.count / totalByType) * 100) : 0;
                return (
                  <div key={t.typeId}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 3,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: COLORS[idx % COLORS.length],
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 120,
                          }}
                        >
                          {t.label}
                        </span>
                      </div>
                      <span
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        background: 'var(--color-background-secondary)',
                        borderRadius: 4,
                        height: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: 4,
                          borderRadius: 4,
                          background: COLORS[idx % COLORS.length],
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {!data?.byType.length && (
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Aucune donnée</p>
              )}
            </div>
          </div>
        </Card>

        {/* Résumé rapide */}
        <Card>
          <SectionHeader title="Résumé rapide" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                label: 'Dernier événement',
                value: summary.latestEntry?.description ?? 'Aucune donnée',
              },
              {
                label: 'Agent le plus actif',
                value: summary.topAgent?.agentName ?? 'N/A',
              },
              {
                label: 'Alerte inactivité',
                value: data?.noEntryAlert ? 'Active' : 'Aucune',
                valueColor: data?.noEntryAlert
                  ? 'var(--color-text-danger)'
                  : 'var(--color-text-success)',
              },
            ].map(({ label, value, valueColor }) => (
              <div
                key={label}
                style={{
                  background: 'var(--color-background-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '10px 12px',
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    marginBottom: 3,
                    letterSpacing: '0.03em',
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: valueColor ?? 'var(--color-text-primary)',
                    lineHeight: 1.4,
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Dernières entrées */}
        <Card>
          <SectionHeader title="Dernières entrées" sub="Activité récente des agents" />
          {data?.recent.length ? (
            <div>
              {data.recent.map((entry, idx) => (
                <div key={entry.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: COLORS[idx % COLORS.length],
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.45,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.description}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {formatTime(entry.timestamp)} · {entry.user.firstName} {entry.user.lastName}
                      </p>
                    </div>
                  </div>
                  {idx < data.recent.length - 1 && (
                    <div
                      style={{ height: '0.5px', background: 'var(--color-border-tertiary)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              Aucune entrée sur cette plage.
            </p>
          )}
        </Card>

        {/* Stats par agent */}
        <Card>
          <SectionHeader title="Stats par agent" sub="Activité individuelle" />
          {data?.byAgent.length ? (
            <div>
              {data.byAgent.map((agent, idx) => (
                <div key={agent.userId}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={agent.agentName} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {agent.agentName}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                          {agent.lastActivity
                            ? `Dernière activité ${formatDateTime(agent.lastActivity)}`
                            : 'Aucune activité'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="count">{agent.count}</Badge>
                  </div>
                  {idx < data.byAgent.length - 1 && (
                    <div
                      style={{ height: '0.5px', background: 'var(--color-border-tertiary)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              Aucun agent actif sur cette plage.
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}