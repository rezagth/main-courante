import { getRedisOrThrow } from '@/lib/redis';

const WINDOW_SECONDS = 60;

export async function recordApiMetric(name: string, statusCode: number, latencyMs: number) {
  try {
    const redis = getRedisOrThrow();
    const base = `metric:${name}:${Math.floor(Date.now() / 1000 / WINDOW_SECONDS)}`;
    await redis.incr(`${base}:count`);
    if (statusCode >= 500) await redis.incr(`${base}:errors`);
    await redis.rpush(`${base}:latencies`, String(latencyMs));
    await redis.expire(`${base}:count`, WINDOW_SECONDS * 5);
    await redis.expire(`${base}:errors`, WINDOW_SECONDS * 5);
    await redis.expire(`${base}:latencies`, WINDOW_SECONDS * 5);
  } catch {
    // noop
  }
}

export async function readApiHealth(name: string) {
  try {
    const redis = getRedisOrThrow();
    const base = `metric:${name}:${Math.floor(Date.now() / 1000 / WINDOW_SECONDS)}`;
    const [countRaw, errorsRaw, latencies] = await Promise.all([
      redis.get(`${base}:count`),
      redis.get(`${base}:errors`),
      redis.lrange(`${base}:latencies`, 0, -1),
    ]);
    const count = Number(countRaw ?? 0);
    const errors = Number(errorsRaw ?? 0);
    const sorted = latencies.map(Number).sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const errorRate = count > 0 ? errors / count : 0;
    return { count, errors, errorRate, p95, alert: errorRate > 0.01 || p95 > 2000 };
  } catch {
    return { count: 0, errors: 0, errorRate: 0, p95: 0, alert: false };
  }
}
