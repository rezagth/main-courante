import { NextResponse } from 'next/server';
import { hash as hashArgon2 } from 'argon2';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';

const patchSchema = z.object({
  email: z.email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  isActive: z.boolean().optional(),
  roleCode: z.string().min(1).optional(),
  siteId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
});

function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('USER:MANAGE');
  const { id } = await context.params;

  const targetUser = await prismaAdmin.user.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: { id: true, email: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.roleCode === 'SUPER_ADMIN' && !actor.roles.includes('SUPER_ADMIN')) {
    return forbidden('Only super admin can assign SUPER_ADMIN role');
  }

  if (payload.email && payload.email !== targetUser.email) {
    const exists = await prismaAdmin.user.findFirst({
      where: { tenantId: actor.tenantId, email: payload.email, NOT: { id } },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ error: 'Email already used by another user' }, { status: 409 });
    }
  }

  if (payload.siteId) {
    const site = await prismaAdmin.site.findFirst({ where: { id: payload.siteId, tenantId: actor.tenantId } });
    if (!site) return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
  }

  if (payload.teamId) {
    const team = await prismaAdmin.team.findFirst({ where: { id: payload.teamId, tenantId: actor.tenantId } });
    if (!team) return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 });
  }

  let roleId: string | null = null;
  if (payload.roleCode) {
    const role = await prismaAdmin.role.findFirst({
      where: { tenantId: actor.tenantId, code: payload.roleCode },
      select: { id: true },
    });
    if (!role) {
      return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
    }
    roleId = role.id;
  }

  const currentAssignment = await prismaAdmin.userRoleAssignment.findFirst({
    where: { tenantId: actor.tenantId, userId: id },
    orderBy: { createdAt: 'desc' },
    select: { roleId: true },
  });

  if ((payload.siteId !== undefined || payload.teamId !== undefined) && !roleId && !currentAssignment?.roleId) {
    return NextResponse.json({ error: 'No existing role assignment to preserve' }, { status: 400 });
  }

  const now = new Date();

  const updated = await prismaAdmin.$transaction(async (tx) => {
    const userUpdateData: Record<string, unknown> = {};
    if (payload.email !== undefined) userUpdateData.email = payload.email;
    if (payload.firstName !== undefined) userUpdateData.firstName = payload.firstName;
    if (payload.lastName !== undefined) userUpdateData.lastName = payload.lastName;
    if (payload.status !== undefined) userUpdateData.status = payload.status;
    if (payload.isActive !== undefined) userUpdateData.isActive = payload.isActive;
    if (payload.siteId !== undefined) userUpdateData.siteId = payload.siteId;
    if (payload.password) userUpdateData.passwordHash = await hashArgon2(payload.password);

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({ where: { id_tenantId: { id, tenantId: actor.tenantId } }, data: userUpdateData });
    }

    if (roleId || payload.siteId !== undefined || payload.teamId !== undefined) {
      const nextRoleId = roleId ?? currentAssignment?.roleId;

      await tx.userRoleAssignment.deleteMany({ where: { tenantId: actor.tenantId, userId: id } });
      await tx.userRoleAssignment.create({
        data: {
          tenantId: actor.tenantId,
          userId: id,
          roleId: nextRoleId!,
          siteId: payload.siteId ?? null,
          teamId: payload.teamId ?? null,
          validFrom: now,
        },
      });
    }

    if (payload.teamId !== undefined) {
      await tx.teamMember.updateMany({
        where: { tenantId: actor.tenantId, userId: id, endedAt: null },
        data: { endedAt: now },
      });

      if (payload.teamId) {
        await tx.teamMember.create({
          data: {
            tenantId: actor.tenantId,
            teamId: payload.teamId,
            userId: id,
            startedAt: now,
          },
        });
      }
    }

    return tx.user.findUniqueOrThrow({
      where: { id_tenantId: { id, tenantId: actor.tenantId } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isActive: true,
        siteId: true,
      },
    });
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('USER:MANAGE');
  const { id } = await context.params;

  const user = await prismaAdmin.user.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prismaAdmin.user.update({
    where: { id_tenantId: { id, tenantId: actor.tenantId } },
    data: { isActive: false, status: 'INACTIVE' },
  });

  return NextResponse.json({ ok: true });
}
