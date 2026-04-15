import type { ReactNode } from 'react';
import Link from 'next/link';

export function AnalyticsShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Analytics</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-100">{title}</h1>
          {subtitle ? <p className="max-w-3xl text-sm text-zinc-400">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

export function MetricsGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function MetricCard({
  label,
  value,
  detail,
  accent = 'text-orange-400',
}: {
  label: string;
  value: string | number;
  detail?: string;
  accent?: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#121212] p-4 text-zinc-100">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <div className={`mt-2 text-3xl font-semibold tracking-[-0.03em] ${accent}`}>{value}</div>
      {detail ? <p className="mt-2 text-sm text-zinc-400">{detail}</p> : null}
    </section>
  );
}

export function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-zinc-100">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/5 pb-3">
        <h2 className="text-sm font-medium tracking-[0.01em] text-zinc-100">{title}</h2>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function NavChip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}
