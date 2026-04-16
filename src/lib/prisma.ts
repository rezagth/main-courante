import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma?: any };
const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();
const globalForPg = globalThis as unknown as { pgPool?: Pool };

const TENANT_MODELS = new Set([
  'Site',
  'Team',
  'User',
  'TeamMember',
  'TypeEvenement',
  'EntreeMainCourante',
  'Role',
  'Permission',
  'RolePermission',
  'UserRoleAssignment',
  'AuditLog',
  'ImpersonationSession',
  'UserTotpFactor',
  'TenantSsoProvider',
  'TenantFeatureFlag',
  'TenantQuota',
  'TenantRetentionPolicy',
  'TenantInvitation',
  'TenantOnboardingChecklist',
  'TenantApiKey',
  'ArchivedEntry',
  'BackupRun',
]);

function findTenantIdDeep(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTenantIdDeep(item);
      if (found) return found;
    }
    return null;
  }

  const obj = value as Record<string, unknown>;
  const direct = obj.tenantId;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }

  for (const key of Object.keys(obj)) {
    const found = findTenantIdDeep(obj[key]);
    if (found) return found;
  }
  return null;
}

function resolveTenantIdFromArgs(args: Record<string, unknown> | undefined): string | null {
  if (!args) return null;
  return findTenantIdDeep(args);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is required for Prisma runtime');
}

const isVercel = process.env.VERCEL === '1';
const poolMax = Number(process.env.PG_POOL_MAX ?? (isVercel ? 3 : 10));

const pgPool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: dbUrl,
    max: poolMax,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pgPool;
}

const prismaAdmin = new PrismaClient({
  adapter: new PrismaPg(pgPool as any),
});

const prismaBase = prismaAdmin.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: any) {
        if (!model || !TENANT_MODELS.has(model)) {
          return query(args);
        }

        const ctx = tenantStorage.getStore();
        const tenantId = ctx?.tenantId ?? resolveTenantIdFromArgs(args as Record<string, unknown> | undefined);
        if (!tenantId) {
          throw new Error(`Missing tenant context for model ${model}`);
        }
        const whereOps = new Set([
          'findUnique',
          'findUniqueOrThrow',
          'findFirst',
          'findFirstOrThrow',
          'findMany',
          'update',
          'updateMany',
          'delete',
          'deleteMany',
          'upsert',
          'count',
          'aggregate',
        ]);
        const dataOps = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert']);

        const nextArgs = { ...(args ?? {}) } as Record<string, unknown>;

        if (whereOps.has(operation)) {
          const currentWhere = (nextArgs.where ?? {}) as Record<string, unknown>;
          nextArgs.where = { ...currentWhere, tenantId };
        }

        if (dataOps.has(operation)) {
          if (operation === 'createMany') {
            const data = (nextArgs.data ?? []) as Array<Record<string, unknown>>;
            nextArgs.data = data.map((item) => ({ ...item, tenantId }));
          } else if (operation === 'upsert') {
            nextArgs.where = { ...((nextArgs.where ?? {}) as Record<string, unknown>), tenantId };
            nextArgs.create = {
              ...((nextArgs.create ?? {}) as Record<string, unknown>),
              tenantId,
            };
            nextArgs.update = {
              ...((nextArgs.update ?? {}) as Record<string, unknown>),
              tenantId,
            };
          } else {
            nextArgs.data = {
              ...((nextArgs.data ?? {}) as Record<string, unknown>),
              tenantId,
            };
          }
        }

        return query(nextArgs);
      },
    },
  },
});

export const prisma = globalForPrisma.prisma ?? prismaBase;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export { prismaAdmin };

export async function withTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantStorage.run({ tenantId }, fn);
}

