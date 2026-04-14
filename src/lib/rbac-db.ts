import { prisma, withTenantContext } from '@/lib/prisma';

type PermissionContext = {
  tenantId: string;
  userId: string;
  permission: string;
  siteId?: string;
  teamId?: string;
};

export async function hasDynamicPermission(ctx: PermissionContext): Promise<boolean> {
  const now = new Date();
  return withTenantContext(ctx.tenantId, async () => {
    const assignments = await prisma.userRoleAssignment.findMany({
      where: {
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

    return assignments.some((assignment) => {
      const siteOk = !assignment.siteId || assignment.siteId === ctx.siteId;
      const teamOk = !assignment.teamId || assignment.teamId === ctx.teamId;
      const permOk = assignment.role.rolePermissions.length > 0;
      return siteOk && teamOk && permOk;
    });
  });
}

export async function assertResourceBelongsToTenant(
  tenantId: string,
  resource: 'entry' | 'site' | 'team' | 'user',
  id: string,
) {
  return withTenantContext(tenantId, async () => {
    switch (resource) {
      case 'entry':
        return prisma.entreeMainCourante.findFirstOrThrow({ where: { id } });
      case 'site':
        return prisma.site.findFirstOrThrow({ where: { id } });
      case 'team':
        return prisma.team.findFirstOrThrow({ where: { id } });
      case 'user':
        return prisma.user.findFirstOrThrow({ where: { id } });
      default:
        throw new Error('Unsupported resource');
    }
  });
}
