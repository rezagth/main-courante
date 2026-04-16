import { getAppBaseUrl } from '@/lib/site-url';

async function getStatus() {
  const base = getAppBaseUrl();
  const res = await fetch(`${base}/api/status`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as {
    status: string;
    uptimeSeconds: number;
    db: boolean;
    s3: boolean;
    alerts?: { errorRate: number; p95: number; alert: boolean };
  };
}

export default async function StatusPage() {
  const data = await getStatus();
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Status</h1>
      <div className="rounded border p-4">
        <p>Etat global: {data?.status ?? 'unknown'}</p>
        <p>Uptime API: {data?.uptimeSeconds ?? 0}s</p>
        <p>Base de donnees: {data?.db ? 'OK' : 'KO'}</p>
        <p>S3: {data?.s3 ? 'OK' : 'KO'}</p>
        <p>Erreur rate: {((data?.alerts?.errorRate ?? 0) * 100).toFixed(2)}%</p>
        <p>Latence P95: {Math.round(data?.alerts?.p95 ?? 0)} ms</p>
        <p>Alerte: {data?.alerts?.alert ? 'ACTIVE' : 'OK'}</p>
      </div>
    </main>
  );
}
