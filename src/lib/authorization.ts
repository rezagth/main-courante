import { auth } from '@/lib/auth';
import { hasDynamicPermission, assertResourceBelongsToTenant } from '@/lib/rbac-db';
import { logAuditEvent } from '@/lib/audit';
import { prismaAdmin } from '@/lib/prisma';

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

export async function getManagedSiteIdsForUser(tenantId: string, userId: string): Promise<string[]> {
  const now = new Date();
  const assignments = await prismaAdmin.siteManagerAssignment.findMany({
    where: {
      tenantId,
      userId,
      startedAt: { lte: now },
      OR: [{ endedAt: null }, { endedAt: { gte: now } }],
    },
    select: { siteId: true },
  });
  return assignments.map((item) => item.siteId);
}

export async function assertChefCanManageAgent(
  tenantId: string,
  chefUserId: string,
  targetUserId: string,
): Promise<void> {
  const managedSiteIds = await getManagedSiteIdsForUser(tenantId, chefUserId);
  if (managedSiteIds.length === 0) {
    throw new Error('Forbidden: no managed site scope');
  }

  const now = new Date();
  const assignment = await prismaAdmin.userLocationAssignment.findFirst({
    where: {
      tenantId,
      userId: targetUserId,
      siteId: { in: managedSiteIds },
      startedAt: { lte: now },
      OR: [{ endedAt: null }, { endedAt: { gte: now } }],
    },
    select: { id: true },
  });

  if (!assignment) {
    throw new Error('Forbidden: target user is outside your managed scope');
  }
}

const GLOBAL_ENTRY_VIEW_ROLES = new Set(['PATRON', 'SUPER_ADMIN', 'CLIENT']);

export type EntryReadScope =
  | { kind: 'tenant' }
  | { kind: 'managed-sites'; siteIds: string[] }
  | { kind: 'own'; userId: string };

export function resolveEntryReadScope(
  roles: string[],
  userId: string,
  managedSiteIds: string[],
): EntryReadScope {
  if (roles.some((role) => GLOBAL_ENTRY_VIEW_ROLES.has(role))) {
    return { kind: 'tenant' };
  }

  if (roles.includes('CHEF_EQUIPE')) {
    return { kind: 'managed-sites', siteIds: managedSiteIds };
  }

  return { kind: 'own', userId };
}
