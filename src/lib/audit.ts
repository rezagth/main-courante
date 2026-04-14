import { prisma, withTenantContext } from '@/lib/prisma';

type AuditInput = {
  tenantId: string;
  userId?: string | null;
  impersonatedBy?: string | null;
  action: string;
  resource: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(input: AuditInput) {
  return withTenantContext(input.tenantId, async () =>
    prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        impersonatedBy: input.impersonatedBy ?? null,
        action: input.action,
        resource: input.resource,
        ip: input.ip ?? null,
        metadata: input.metadata,
      },
    }),
  );
}
