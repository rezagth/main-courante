import { incrementWithWindow } from '@/lib/redis';

const LOGIN_WINDOW_SECONDS = 60 * 10;
const LOGIN_MAX_ATTEMPTS = 8;

export async function assertLoginRateLimit(ip: string): Promise<void> {
  const key = `rl:login:${ip}`;
  const attempts = await incrementWithWindow(key, LOGIN_WINDOW_SECONDS);
  if (attempts > LOGIN_MAX_ATTEMPTS) {
    throw new Error('Too many attempts. Try again later.');
  }
}

export function extractIp(value: string | null): string {
  if (!value) return 'unknown';
  const [first] = value.split(',');
  return first?.trim() || 'unknown';
}
