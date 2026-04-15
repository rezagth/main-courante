import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hash as hashArgon2 } from 'argon2';
import { prismaAdmin } from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';

const createSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  roleCode: z.string().min(1),
  siteId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
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

  const assignmentByUser = new Map<string, (typeof assignments)[number]>();
  for (const assignment of assignments) {
    if (!assignmentByUser.has(assignment.userId)) {
      assignmentByUser.set(assignment.userId, assignment);
    }
  }

  return NextResponse.json({
    users: users.map((item) => {
      const role = assignmentByUser.get(item.id);
      return {
        ...item,
        roleCode: role?.role.code ?? null,
        roleLabel: role?.role.label ?? null,
        assignmentSiteId: role?.siteId ?? null,
        assignmentTeamId: role?.teamId ?? null,
      };
    }),
    roles,
    sites,
    teams,
  });
}

export async function POST(request: Request) {
  const actor = await requirePermission('USER:MANAGE');
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const message = Object.values(errors.fieldErrors)
      .flat()
      .join('; ') || 'Validation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { email, firstName, lastName, password, roleCode, siteId, teamId } = parsed.data;

  if (roleCode === 'SUPER_ADMIN' && !actor.roles.includes('SUPER_ADMIN')) {
    return forbidden('Only super admin can create a super admin user');
  }

  const role = await prismaAdmin.role.findFirst({
    where: { tenantId: actor.tenantId, code: roleCode },
    select: { id: true, code: true },
  });

  if (!role) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  }

  if (siteId) {
    const site = await prismaAdmin.site.findFirst({ where: { id: siteId, tenantId: actor.tenantId } });
    if (!site) return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
  }

  if (teamId) {
    const team = await prismaAdmin.team.findFirst({ where: { id: teamId, tenantId: actor.tenantId } });
    if (!team) return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 });
  }

  const existing = await prismaAdmin.user.findFirst({ where: { tenantId: actor.tenantId, email } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists for this tenant' }, { status: 409 });
  }

  const passwordHash = await hashArgon2(password);
  const now = new Date();

  const created = await prismaAdmin.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        tenantId: actor.tenantId,
        email,
        firstName,
        lastName,
        passwordHash,
        isActive: true,
        status: 'ACTIVE',
        siteId: siteId ?? null,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    await tx.userRoleAssignment.create({
      data: {
        tenantId: actor.tenantId,
        userId: newUser.id,
        roleId: role.id,
        siteId: siteId ?? null,
        teamId: teamId ?? null,
        validFrom: now,
      },
    });

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
