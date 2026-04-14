import { prismaAdmin } from '@/lib/prisma';

type PermissionContext = {
  tenantId: string;
  userId: string;
  permission: string;
  siteId?: string;
  teamId?: string;
};

export async function hasDynamicPermission(ctx: PermissionContext): Promise<boolean> {
  const now = new Date();
  const assignments = await prismaAdmin.userRoleAssignment.findMany({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            where: {
              allowed: true,
              permission: { code: ctx.permission },
            },
            include: { permission: true },
          },
        },
      },
    },
  });

  return assignments.some((assignment: (typeof assignments)[number]) => {
    const siteOk = !assignment.siteId || assignment.siteId === ctx.siteId;
    const teamOk = !assignment.teamId || assignment.teamId === ctx.teamId;
    const permOk = assignment.role.rolePermissions.length > 0;
    return siteOk && teamOk && permOk;
  });
}

export async function assertResourceBelongsToTenant(
  tenantId: string,
  resource: 'entry' | 'site' | 'team' | 'user',
  id: string,
) {
  switch (resource) {
    case 'entry':
      return prismaAdmin.entreeMainCourante.findFirstOrThrow({ where: { id, tenantId } });
    case 'site':
      return prismaAdmin.site.findFirstOrThrow({ where: { id, tenantId } });
    case 'team':
      return prismaAdmin.team.findFirstOrThrow({ where: { id, tenantId } });
    case 'user':
      return prismaAdmin.user.findFirstOrThrow({ where: { id, tenantId } });
    default:
      throw new Error('Unsupported resource');
  }
}
