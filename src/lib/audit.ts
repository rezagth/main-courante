import type { Prisma } from '@prisma/client';
import { prismaAdmin } from '@/lib/prisma';

type AuditInput = {
  tenantId: string;
  userId?: string | null;
  impersonatedBy?: string | null;
  action: string;
  resource: string;
  ip?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logAuditEvent(input: AuditInput) {
  return prismaAdmin.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      impersonatedBy: input.impersonatedBy ?? null,
      action: input.action,
      resource: input.resource,
      ip: input.ip ?? null,
      metadata: input.metadata,
    },
  });
}
