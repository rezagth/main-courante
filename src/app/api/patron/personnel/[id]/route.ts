import { NextResponse } from 'next/server';
import { hash as hashArgon2 } from 'argon2';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { hasLocationAssignmentTables } from '@/lib/location-assignments-compat';

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
  locationAssignments: z
    .array(
      z.object({
        siteId: z.string().uuid(),
        locationId: z.string().uuid().optional().nullable(),
      }),
    )
    .optional(),
  managedSiteIds: z.array(z.string().uuid()).optional(),
});

function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('USER:MANAGE');
  const locationTablesReady = await hasLocationAssignmentTables();
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
  const normalizedEmail = payload.email?.trim().toLowerCase();
  const fallbackSiteIdFromLocationAssignments = payload.locationAssignments?.[0]?.siteId ?? null;
  const fallbackManagedSiteId = payload.managedSiteIds?.[0] ?? null;
  const effectiveSiteId =
    payload.siteId !== undefined
      ? payload.siteId
      : locationTablesReady
        ? undefined
        : fallbackSiteIdFromLocationAssignments ?? fallbackManagedSiteId;

  if (payload.roleCode === 'SUPER_ADMIN' && !actor.roles.includes('SUPER_ADMIN')) {
    return forbidden('Only super admin can assign SUPER_ADMIN role');
  }

  if (normalizedEmail && normalizedEmail !== targetUser.email) {
    const exists = await prismaAdmin.user.findFirst({
      where: { tenantId: actor.tenantId, email: normalizedEmail, NOT: { id } },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ error: 'Email already used by another user' }, { status: 409 });
    }
  }

  if (effectiveSiteId) {
    const site = await prismaAdmin.site.findFirst({ where: { id: effectiveSiteId, tenantId: actor.tenantId } });
    if (!site) return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
  }

  if (payload.teamId) {
    const team = await prismaAdmin.team.findFirst({ where: { id: payload.teamId, tenantId: actor.tenantId } });
    if (!team) return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 });
    if (effectiveSiteId && team.siteId !== effectiveSiteId) {
      return NextResponse.json({ error: 'teamId does not belong to siteId' }, { status: 400 });
    }
  }

  if (payload.teamId && effectiveSiteId === null) {
    return NextResponse.json({ error: 'siteId cannot be null when teamId is provided' }, { status: 400 });
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
    include: { role: { select: { code: true } } },
  });

  const nextRoleCode = payload.roleCode ?? currentAssignment?.role.code ?? null;
  if ((payload.managedSiteIds?.length ?? 0) > 0 && nextRoleCode !== 'CHEF_EQUIPE') {
    return NextResponse.json({ error: 'managedSiteIds is only allowed for CHEF_EQUIPE role' }, { status: 400 });
  }

  const normalizedLocationAssignments =
    payload.locationAssignments !== undefined
      ? payload.locationAssignments
      : effectiveSiteId && locationTablesReady
        ? [{ siteId: effectiveSiteId, locationId: null }]
        : undefined;
  const normalizedManagedSiteIds = payload.managedSiteIds ? [...new Set(payload.managedSiteIds)] : undefined;
  const effectiveManagedSiteIds = locationTablesReady ? normalizedManagedSiteIds : undefined;

  if (locationTablesReady && effectiveManagedSiteIds && effectiveManagedSiteIds.length > 0) {
    const managedSites = await prismaAdmin.site.findMany({
      where: { id: { in: effectiveManagedSiteIds }, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (managedSites.length !== effectiveManagedSiteIds.length) {
      return NextResponse.json({ error: 'Invalid managedSiteIds' }, { status: 400 });
    }
  }

  if (locationTablesReady && normalizedLocationAssignments && normalizedLocationAssignments.length > 0) {
    const uniqueSiteIds = [...new Set(normalizedLocationAssignments.map((item) => item.siteId))];
    const tenantSites = await prismaAdmin.site.findMany({
      where: { tenantId: actor.tenantId, id: { in: uniqueSiteIds } },
      select: { id: true },
    });
    if (tenantSites.length !== uniqueSiteIds.length) {
      return NextResponse.json({ error: 'Invalid siteId in locationAssignments' }, { status: 400 });
    }

    const locationIds = normalizedLocationAssignments
      .map((item) => item.locationId)
      .filter((value): value is string => Boolean(value));
    if (locationIds.length > 0) {
      const locations = await prismaAdmin.location.findMany({
        where: { tenantId: actor.tenantId, id: { in: locationIds } },
        select: { id: true, siteId: true },
      });
      const locationById = new Map(locations.map((location) => [location.id, location]));
      for (const assignment of normalizedLocationAssignments) {
        if (!assignment.locationId) continue;
        const location = locationById.get(assignment.locationId);
        if (!location) {
          return NextResponse.json({ error: 'Invalid locationId in locationAssignments' }, { status: 400 });
        }
        if (location.siteId !== assignment.siteId) {
          return NextResponse.json({ error: 'locationId does not belong to siteId' }, { status: 400 });
        }
      }
    }
  }

  if ((payload.siteId !== undefined || payload.teamId !== undefined) && !roleId && !currentAssignment?.roleId) {
    return NextResponse.json({ error: 'No existing role assignment to preserve' }, { status: 400 });
  }

  const now = new Date();

  const updated = await prismaAdmin.$transaction(async (tx) => {
    const userUpdateData: Record<string, unknown> = {};
    if (normalizedEmail !== undefined) userUpdateData.email = normalizedEmail;
    if (payload.firstName !== undefined) userUpdateData.firstName = payload.firstName;
    if (payload.lastName !== undefined) userUpdateData.lastName = payload.lastName;
    if (payload.status !== undefined) userUpdateData.status = payload.status;
    if (payload.isActive !== undefined) userUpdateData.isActive = payload.isActive;
    const primarySiteFromAssignments =
      normalizedLocationAssignments && normalizedLocationAssignments.length > 0
        ? normalizedLocationAssignments[0]?.siteId ?? null
        : undefined;

    if (effectiveSiteId !== undefined) {
      userUpdateData.siteId = effectiveSiteId;
    } else if (primarySiteFromAssignments !== undefined) {
      userUpdateData.siteId = primarySiteFromAssignments;
    }
    if (payload.password) userUpdateData.passwordHash = await hashArgon2(payload.password);

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({ where: { id_tenantId: { id, tenantId: actor.tenantId } }, data: userUpdateData });
    }

    if (roleId || payload.siteId !== undefined || payload.teamId !== undefined || normalizedLocationAssignments !== undefined) {
      const nextRoleId = roleId ?? currentAssignment?.roleId;
      const scopedSiteId =
        effectiveSiteId !== undefined
          ? effectiveSiteId
          : normalizedLocationAssignments && normalizedLocationAssignments.length === 1
            ? normalizedLocationAssignments[0]?.siteId ?? null
            : null;

      await tx.userRoleAssignment.deleteMany({ where: { tenantId: actor.tenantId, userId: id } });
      await tx.userRoleAssignment.create({
        data: {
          tenantId: actor.tenantId,
          userId: id,
          roleId: nextRoleId!,
          siteId: scopedSiteId,
          teamId: payload.teamId ?? null,
          validFrom: now,
        },
      });
    }

    if (locationTablesReady && normalizedLocationAssignments !== undefined) {
      await tx.userLocationAssignment.updateMany({
        where: { tenantId: actor.tenantId, userId: id, endedAt: null },
        data: { endedAt: now },
      });

      if (normalizedLocationAssignments.length > 0) {
        await tx.userLocationAssignment.createMany({
          data: normalizedLocationAssignments.map((assignment) => ({
            tenantId: actor.tenantId,
            userId: id,
            siteId: assignment.siteId,
            locationId: assignment.locationId ?? null,
            startedAt: now,
          })),
        });
      }
    }

    if (locationTablesReady && effectiveManagedSiteIds !== undefined) {
      await tx.siteManagerAssignment.updateMany({
        where: { tenantId: actor.tenantId, userId: id, endedAt: null },
        data: { endedAt: now },
      });

      if (effectiveManagedSiteIds.length > 0) {
        await tx.siteManagerAssignment.createMany({
          data: effectiveManagedSiteIds.map((managedSiteId) => ({
            tenantId: actor.tenantId,
            userId: id,
            siteId: managedSiteId,
            startedAt: now,
          })),
        });
      }
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
