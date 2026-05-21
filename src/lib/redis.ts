import { Redis } from 'ioredis';

const redisEnabled = process.env.REDIS_ENABLED === 'true';
const redisUrl = redisEnabled ? process.env.REDIS_URL : null;

type GlobalRedis = typeof globalThis & { __redis?: Redis };
type GlobalRateLimitStore = typeof globalThis & {
  __rateLimitStore?: Map<string, { count: number; expiresAt: number }>;
};

const getClient = () => {
  if (!redisUrl) return null;
  const g = globalThis as GlobalRedis;
  if (!g.__redis) {
    g.__redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  return g.__redis;
};

export function getRedisClient(): Redis | null {
  return getClient();
}

export function getRedisOrThrow(): Redis {
  const client = getRedisClient();
  if (!client) {
    throw new Error('REDIS_URL is not configured');
  }
  return client;
}

export async function incrementWithWindow(
  key: string,
  windowSeconds: number,
): Promise<number> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      return count;
    } catch {
      // Fall back to the in-memory counter when Redis is configured but unavailable.
    }
  }

  // Dev fallback when REDIS_URL is not configured.
  const g = globalThis as GlobalRateLimitStore;
  if (!g.__rateLimitStore) {
    g.__rateLimitStore = new Map();
  }
  const store = g.__rateLimitStore;
  const now = Date.now();
  const expiresAt = now + windowSeconds * 1000;
  const existing = store.get(key);
  if (!existing || existing.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt });
    return 1;
  }
  const next = { count: existing.count + 1, expiresAt: existing.expiresAt };
  store.set(key, next);
  return next.count;
}

