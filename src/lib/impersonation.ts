import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma, withTenantContext } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

const IMPERSONATION_COOKIE = 'impersonation_token';
const IMPERSONATION_TTL_SECONDS = 60 * 60;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function startImpersonation(input: {
  actorUserId: string;
  targetUserId: string;
  tenantId: string;
  ip?: string;
}) {
  const rawToken = randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawToken);

  const session = await withTenantContext(input.tenantId, async () =>
    prisma.impersonationSession.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId,
        tokenHash,
      },
    }),
  );

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: IMPERSONATION_TTL_SECONDS,
    path: '/',
  });

  await logAuditEvent({
    tenantId: input.tenantId,
    userId: input.targetUserId,
    impersonatedBy: input.actorUserId,
    action: 'IMPERSONATION_START',
    resource: 'auth',
    ip: input.ip,
    metadata: { impersonationSessionId: session.id },
  });

  return session;
}

export async function stopImpersonation(tenantId: string, reason: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!token) return;
  const tokenHash = hashToken(token);

  const session = await withTenantContext(tenantId, async () =>
    prisma.impersonationSession.findFirst({
      where: { tokenHash, endedAt: null },
    }),
  );
  if (!session) return;

  await withTenantContext(tenantId, async () =>
    prisma.impersonationSession.update({
      where: { id: session.id, tenantId },
      data: { endedAt: new Date(), endedReason: reason },
    }),
  );

  cookieStore.delete(IMPERSONATION_COOKIE);
}

export async function readImpersonationToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(IMPERSONATION_COOKIE)?.value ?? null;
}
