import { createHash } from 'node:crypto';
import { incrementWithWindow } from '@/lib/redis';
import { prismaAdmin } from '@/lib/prisma';

function hashKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export async function authenticateApiKey(rawApiKey: string) {
  const keyHash = hashKey(rawApiKey);
  const key = await prismaAdmin.tenantApiKey.findFirst({
    where: { keyHash, isActive: true },
    include: { tenant: true },
  });
  if (!key) return null;

  const bucket = `rl:api-key:${key.id}`;
  const requests = await incrementWithWindow(bucket, 60);
  if (requests > 100) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  await prismaAdmin.tenantApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return key;
}
