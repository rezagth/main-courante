import { createHash, randomBytes } from 'node:crypto';
import { prismaAdmin } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createInvitationLink(tenantId: string, email: string, createdById?: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prismaAdmin.tenantInvitation.create({
    data: {
      tenantId,
      email,
      tokenHash,
      expiresAt,
      createdById: createdById ?? null,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/onboarding/accept?token=${token}`;
  logger.info('magic_link_created', { tenantId, email });
  return url;
}
