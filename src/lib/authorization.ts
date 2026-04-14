import { auth } from '@/lib/auth';
import { hasDynamicPermission, assertResourceBelongsToTenant } from '@/lib/rbac-db';
import { logAuditEvent } from '@/lib/audit';

export async function requirePermission(permission: string, context?: { siteId?: string; teamId?: string }) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const allowed = await hasDynamicPermission({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    permission,
    siteId: context?.siteId ?? session.user.siteId ?? undefined,
    teamId: context?.teamId,
  });

  if (!allowed) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }

  return session.user;
}

export async function assertTenantResourceOwnership(
  resource: 'entry' | 'site' | 'team' | 'user',
  id: string,
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized');
  }

  await assertResourceBelongsToTenant(session.user.tenantId, resource, id);
}

export async function auditSensitiveRead(resource: string, resourceId: string, ip?: string) {
  const session = await auth();
  if (!session?.user) return;

  await logAuditEvent({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    impersonatedBy: session.user.impersonatedBy ?? null,
    action: 'SENSITIVE_READ',
    resource,
    ip,
    metadata: { resourceId },
  });
}

export async function requireAnyRole(roles: string[]) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  const granted = session.user.roles.some((role) => roles.includes(role));
  if (!granted) {
    throw new Error('Forbidden');
  }
  return session.user;
}
