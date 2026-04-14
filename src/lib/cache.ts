import { getRedisOrThrow } from '@/lib/redis';

const DEFAULT_TTL_SECONDS = 300;

export async function cachedJson<T>(
  key: string,
  producer: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<T> {
  try {
    const redis = getRedisOrThrow();
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    const value = await producer();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  } catch {
    return producer();
  }
}
