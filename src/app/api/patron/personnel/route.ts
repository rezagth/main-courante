import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hash as hashArgon2 } from 'argon2';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { hasLocationAssignmentTables, isMissingTableError } from '@/lib/location-assignments-compat';

const createSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  roleCode: z.string().min(1),
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

export async function GET() {
  const user = await requirePermission('USER:MANAGE');

  const now = new Date();
  const [users, roles, sites, teams, assignments] = await Promise.all([
    prismaAdmin.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        status: true,
        siteId: true,
        createdAt: true,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    }),
    prismaAdmin.role.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, code: true, label: true },
      orderBy: { label: 'asc' },
    }),
    prismaAdmin.site.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
    prismaAdmin.team.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true, code: true, siteId: true },
      orderBy: { name: 'asc' },
    }),
    prismaAdmin.userRoleAssignment.findMany({
      where: {
        tenantId: user.tenantId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      include: { role: { select: { code: true, label: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let locations: Array<{ id: string; name: string; code: string; siteId: string }> = [];
  let locationAssignments: Array<{ userId: string; siteId: string; locationId: string | null }> = [];
  let managerAssignments: Array<{ userId: string; siteId: string }> = [];

  if (await hasLocationAssignmentTables()) {
    try {
      [locations, locationAssignments, managerAssignments] = await Promise.all([
        prismaAdmin.location.findMany({
          where: { tenantId: user.tenantId, isActive: true },
          select: { id: true, name: true, code: true, siteId: true },
          orderBy: [{ siteId: 'asc' }, { name: 'asc' }],
        }),
        prismaAdmin.userLocationAssignment.findMany({
          where: {
            tenantId: user.tenantId,
            startedAt: { lte: now },
            OR: [{ endedAt: null }, { endedAt: { gte: now } }],
          },
          select: {
            userId: true,
            siteId: true,
            locationId: true,
          },
          orderBy: [{ userId: 'asc' }, { startedAt: 'desc' }],
        }),
        prismaAdmin.siteManagerAssignment.findMany({
          where: {
            tenantId: user.tenantId,
            startedAt: { lte: now },
            OR: [{ endedAt: null }, { endedAt: { gte: now } }],
          },
          select: { userId: true, siteId: true },
          orderBy: [{ userId: 'asc' }, { startedAt: 'desc' }],
        }),
      ]);
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }
    }
  }

  const assignmentByUser = new Map<string, (typeof assignments)[number]>();
  for (const assignment of assignments) {
    if (!assignmentByUser.has(assignment.userId)) {
      assignmentByUser.set(assignment.userId, assignment);
    }
  }

  const locationsByUser = new Map<string, Array<{ siteId: string; locationId: string | null }>>();
  for (const assignment of locationAssignments) {
    const current = locationsByUser.get(assignment.userId) ?? [];
    current.push({ siteId: assignment.siteId, locationId: assignment.locationId ?? null });
    locationsByUser.set(assignment.userId, current);
  }

  const managedSitesByUser = new Map<string, string[]>();
  for (const assignment of managerAssignments) {
    const current = managedSitesByUser.get(assignment.userId) ?? [];
    if (!current.includes(assignment.siteId)) {
      current.push(assignment.siteId);
    }
    managedSitesByUser.set(assignment.userId, current);
  }

  return NextResponse.json({
    users: users.map((item) => {
      const role = assignmentByUser.get(item.id);
      const userLocationAssignments = locationsByUser.get(item.id) ?? [];
      return {
        ...item,
        roleCode: role?.role.code ?? null,
        roleLabel: role?.role.label ?? null,
        assignmentSiteId: role?.siteId ?? null,
        assignmentTeamId: role?.teamId ?? null,
        locationAssignments: userLocationAssignments,
        managedSiteIds: managedSitesByUser.get(item.id) ?? [],
      };
    }),
    roles,
    sites,
    teams,
    locations,
  });
}

export async function POST(request: Request) {
  const actor = await requirePermission('USER:MANAGE');
  const locationTablesReady = await hasLocationAssignmentTables();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const message = Object.values(errors.fieldErrors)
      .flat()
      .join('; ') || 'Validation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const {
    email,
    firstName,
    lastName,
    password,
    roleCode,
    siteId,
    teamId,
    locationAssignments,
    managedSiteIds,
  } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const normalizedManagedSiteIds = [...new Set(managedSiteIds ?? [])];
  const fallbackSiteIdFromLocationAssignments = locationAssignments?.[0]?.siteId ?? null;
  const fallbackManagedSiteId = managedSiteIds?.[0] ?? null;

  const effectiveSiteId =
    siteId ?? (locationTablesReady ? null : fallbackSiteIdFromLocationAssignments ?? fallbackManagedSiteId);

  const effectiveManagedSiteIds = locationTablesReady ? normalizedManagedSiteIds : [];
  const normalizedLocationAssignments =
    locationAssignments && locationAssignments.length > 0
      ? locationAssignments
      : effectiveSiteId && locationTablesReady
        ? [{ siteId: effectiveSiteId, locationId: null }]
        : [];

  if (roleCode === 'SUPER_ADMIN' && !actor.roles.includes('SUPER_ADMIN')) {
    return forbidden('Only super admin can create a super admin user');
  }

  if (normalizedManagedSiteIds.length > 0 && roleCode !== 'CHEF_EQUIPE') {
    return NextResponse.json({ error: 'managedSiteIds is only allowed for CHEF_EQUIPE role' }, { status: 400 });
  }

  const role = await prismaAdmin.role.findFirst({
    where: { tenantId: actor.tenantId, code: roleCode },
    select: { id: true, code: true },
  });

  if (!role) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  }

  if (effectiveSiteId) {
    const site = await prismaAdmin.site.findFirst({ where: { id: effectiveSiteId, tenantId: actor.tenantId } });
    if (!site) return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
  }

  if (locationTablesReady && normalizedManagedSiteIds.length > 0) {
    const managedSites = await prismaAdmin.site.findMany({
      where: { id: { in: normalizedManagedSiteIds }, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (managedSites.length !== normalizedManagedSiteIds.length) {
      return NextResponse.json({ error: 'Invalid managedSiteIds' }, { status: 400 });
    }
  }

  if (teamId) {
    const team = await prismaAdmin.team.findFirst({ where: { id: teamId, tenantId: actor.tenantId } });
    if (!team) return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 });
    if (effectiveSiteId && team.siteId !== effectiveSiteId) {
      return NextResponse.json({ error: 'teamId does not belong to siteId' }, { status: 400 });
    }
    if (!effectiveSiteId) {
      return NextResponse.json({ error: 'siteId is required when teamId is provided' }, { status: 400 });
    }
  }

  if (locationTablesReady && normalizedLocationAssignments.length > 0) {
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

  const existing = await prismaAdmin.user.findFirst({ where: { tenantId: actor.tenantId, email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists for this tenant' }, { status: 409 });
  }

  const passwordHash = await hashArgon2(password);
  const now = new Date();
  const primarySiteId = effectiveSiteId ?? normalizedLocationAssignments[0]?.siteId ?? null;
  const roleScopeSiteId =
    effectiveSiteId ?? (normalizedLocationAssignments.length === 1 ? normalizedLocationAssignments[0]?.siteId ?? null : null);

  const created = await prismaAdmin.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        tenantId: actor.tenantId,
        email: normalizedEmail,
        firstName,
        lastName,
        passwordHash,
        isActive: true,
        status: 'ACTIVE',
        siteId: primarySiteId,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    await tx.userRoleAssignment.create({
      data: {
        tenantId: actor.tenantId,
        userId: newUser.id,
        roleId: role.id,
        siteId: roleScopeSiteId,
        teamId: teamId ?? null,
        validFrom: now,
      },
    });

    if (locationTablesReady && normalizedLocationAssignments.length > 0) {
      await tx.userLocationAssignment.createMany({
        data: normalizedLocationAssignments.map((assignment) => ({
          tenantId: actor.tenantId,
          userId: newUser.id,
          siteId: assignment.siteId,
          locationId: assignment.locationId ?? null,
          startedAt: now,
        })),
      });
    }

    if (locationTablesReady && effectiveManagedSiteIds.length > 0) {
      await tx.siteManagerAssignment.createMany({
        data: effectiveManagedSiteIds.map((managedSiteId) => ({
          tenantId: actor.tenantId,
          userId: newUser.id,
          siteId: managedSiteId,
          startedAt: now,
        })),
      });
    }

    if (teamId) {
      await tx.teamMember.create({
        data: {
          tenantId: actor.tenantId,
          teamId,
          userId: newUser.id,
          startedAt: now,
        },
      });
    }

    return newUser;
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
