import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractIp } from '@/lib/security';
import { startImpersonation } from '@/lib/impersonation';
import { withTenantContext, prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.roles.includes('SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { targetUserId } = (await request.json()) as { targetUserId?: string };
  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const ip = extractIp(request.headers.get('x-forwarded-for'));

  const target = await withTenantContext(tenantId, async () =>
    prisma.user.findFirst({ where: { id: targetUserId, isActive: true } }),
  );
  if (!target) {
    return NextResponse.json({ error: 'Target not found' }, { status: 404 });
  }

  const impersonation = await startImpersonation({
    actorUserId: session.user.id,
    targetUserId: target.id,
    tenantId,
    ip,
  });

  await logAuditEvent({
    tenantId,
    userId: target.id,
    impersonatedBy: session.user.id,
    action: 'ADMIN_IMPERSONATE',
    resource: 'user',
    ip,
    metadata: { targetUserId: target.id, impersonationId: impersonation.id },
  });

  return NextResponse.json({ ok: true, impersonationId: impersonation.id });
}
