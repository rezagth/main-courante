import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash as hashArgon2 } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const tenantCode = process.env.BOOTSTRAP_TENANT_CODE ?? 'DEMO';
const tenantName = process.env.BOOTSTRAP_TENANT_NAME ?? 'Tenant Demo';
const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@demo.local';
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin1234!';

const roleDefs = [
  { code: 'SUPER_ADMIN', label: 'Super Admin' },
  { code: 'PATRON', label: 'Patron' },
  { code: 'CHEF_EQUIPE', label: "Chef d'equipe" },
  { code: 'AGENT', label: 'Agent' },
  { code: 'CLIENT', label: 'Client' },
];

const permissionDefs = [
  { resource: 'ENTRY', action: 'CREATE', code: 'ENTRY:CREATE' },
  { resource: 'ENTRY', action: 'READ', code: 'ENTRY:READ' },
  { resource: 'ENTRY', action: 'UPDATE', code: 'ENTRY:UPDATE' },
  { resource: 'ENTRY', action: 'DELETE', code: 'ENTRY:DELETE' },
  { resource: 'ENTRY', action: 'EXPORT', code: 'ENTRY:EXPORT' },
  { resource: 'TYPE_EVENT', action: 'MANAGE', code: 'TYPE_EVENT:MANAGE' },
  { resource: 'USER', action: 'READ', code: 'USER:READ' },
  { resource: 'USER', action: 'MANAGE', code: 'USER:MANAGE' },
  { resource: 'TENANT', action: 'CREATE', code: 'TENANT:CREATE' },
  { resource: 'SITE', action: 'MANAGE', code: 'SITE:MANAGE' },
  { resource: 'ROLE', action: 'MANAGE', code: 'ROLE:MANAGE' },
];

const defaultTypes = [
  { code: 'RONDE', label: 'Ronde' },
  { code: 'ALARME', label: 'Alarme' },
  { code: 'ANOMALIE', label: 'Anomalie' },
  { code: 'OBSERVATION', label: 'Observation' },
  { code: 'INTERVENTION', label: 'Intervention' },
];
const createSampleEntries = (process.env.BOOTSTRAP_SAMPLE_ENTRIES ?? 'true') === 'true';

async function run() {
  const passwordHash = await hashArgon2(adminPassword);

  const tenant = await prisma.tenant.upsert({
    where: { code: tenantCode },
    create: {
      code: tenantCode,
      name: tenantName,
      plan: 'STANDARD',
      status: 'ACTIVE',
      quotas: {
        create: {
          maxActiveUsers: 25,
          maxEntriesPerMonth: 10000,
          maxStorageGb: 20,
        },
      },
      retentionPolicy: {
        create: { activeYears: 1, archiveYears: 5 },
      },
      onboarding: {
        create: {
          siteCreated: true,
          teamCreated: true,
          agentInvited: true,
          completedAt: new Date(),
        },
      },
    },
    update: { name: tenantName, status: 'ACTIVE' },
  });

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
    update: {
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  const roles = {};
  for (const def of roleDefs) {
    roles[def.code] = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: def.code } },
      create: {
        tenantId: tenant.id,
        code: def.code,
        label: def.label,
        isSystem: true,
      },
      update: { label: def.label, isSystem: true },
    });
  }

  for (const item of permissionDefs) {
    const permission = await prisma.permission.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: item.code } },
      create: {
        tenantId: tenant.id,
        resource: item.resource,
        action: item.action,
        code: item.code,
      },
      update: {},
    });

    for (const roleCode of ['SUPER_ADMIN', 'PATRON', 'CHEF_EQUIPE', 'AGENT', 'CLIENT']) {
      const role = roles[roleCode];
      const shouldAllow =
        roleCode === 'SUPER_ADMIN' ||
        (roleCode === 'PATRON' &&
          [
            'ENTRY:CREATE',
            'ENTRY:READ',
            'ENTRY:UPDATE',
            'ENTRY:DELETE',
            'ENTRY:EXPORT',
            'TYPE_EVENT:MANAGE',
            'USER:READ',
            'USER:MANAGE',
            'TENANT:CREATE',
            'SITE:MANAGE',
            'ROLE:MANAGE',
          ].includes(item.code)) ||
        (roleCode === 'CHEF_EQUIPE' &&
          ['ENTRY:CREATE', 'ENTRY:READ', 'ENTRY:UPDATE', 'ENTRY:EXPORT', 'TYPE_EVENT:MANAGE', 'USER:READ'].includes(item.code)) ||
        (roleCode === 'AGENT' && ['ENTRY:CREATE', 'ENTRY:READ', 'ENTRY:UPDATE'].includes(item.code)) ||
        (roleCode === 'CLIENT' && ['ENTRY:READ'].includes(item.code));

      await prisma.rolePermission.upsert({
        where: {
          tenantId_roleId_permissionId: {
            tenantId: tenant.id,
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        create: {
          tenantId: tenant.id,
          roleId: role.id,
          permissionId: permission.id,
          allowed: shouldAllow,
        },
        update: { allowed: shouldAllow },
      });
    }
  }

  const defaultValidFrom = new Date('2026-01-01T00:00:00.000Z');
  async function ensureAssignment(userId, roleId) {
    const existingAssignment = await prisma.userRoleAssignment.findFirst({
      where: {
        tenantId: tenant.id,
        userId,
        roleId,
        siteId: null,
        teamId: null,
        validFrom: defaultValidFrom,
      },
    });
    if (!existingAssignment) {
      await prisma.userRoleAssignment.create({
        data: {
          tenantId: tenant.id,
          userId,
          roleId,
          siteId: null,
          teamId: null,
          validFrom: defaultValidFrom,
        },
      });
    }
  }

  await ensureAssignment(user.id, roles.SUPER_ADMIN.id);

  const site = await prisma.site.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SITE-1' } },
    create: {
      tenantId: tenant.id,
      code: 'SITE-1',
      name: 'Site Principal',
      address: 'Adresse a definir',
    },
    update: {},
  });

  const team = await prisma.team.upsert({
    where: { tenantId_siteId_code: { tenantId: tenant.id, siteId: site.id, code: 'TEAM-A' } },
    create: {
      tenantId: tenant.id,
      siteId: site.id,
      code: 'TEAM-A',
      name: 'Equipe A',
    },
    update: {},
  });

  await prisma.teamMember.upsert({
    where: {
      tenantId_teamId_userId_startedAt: {
        tenantId: tenant.id,
        teamId: team.id,
        userId: user.id,
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    create: {
      tenantId: tenant.id,
      teamId: team.id,
      userId: user.id,
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    update: { endedAt: null },
  });

  for (const item of defaultTypes) {
    await prisma.typeEvenement.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: item.code } },
      create: {
        tenantId: tenant.id,
        code: item.code,
        label: item.label,
      },
      update: { label: item.label, isActive: true },
    });
  }

  const roleUsers = [
    {
      email: 'patron@demo.local',
      firstName: 'Sarah',
      lastName: 'Patron',
      roleCode: 'PATRON',
      password: 'Patron1234!',
    },
    {
      email: 'chef@demo.local',
      firstName: 'Nora',
      lastName: 'Chef',
      roleCode: 'CHEF_EQUIPE',
      password: 'Chef1234!',
    },
    {
      email: 'agent@demo.local',
      firstName: 'Ali',
      lastName: 'Agent',
      roleCode: 'AGENT',
      password: 'Agent1234!',
    },
    {
      email: 'client@demo.local',
      firstName: 'Lea',
      lastName: 'Client',
      roleCode: 'CLIENT',
      password: 'Client1234!',
    },
  ];

  const createdRoleUsers = {};
  for (const item of roleUsers) {
    const userPasswordHash = await hashArgon2(item.password);
    const roleUser = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: item.email } },
      create: {
        tenantId: tenant.id,
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        passwordHash: userPasswordHash,
        isActive: true,
        status: 'ACTIVE',
        siteId: site.id,
      },
      update: {
        firstName: item.firstName,
        lastName: item.lastName,
        passwordHash: userPasswordHash,
        isActive: true,
        status: 'ACTIVE',
        siteId: site.id,
      },
    });

    await prisma.userRoleAssignment.deleteMany({
      where: { tenantId: tenant.id, userId: roleUser.id },
    });
    await ensureAssignment(roleUser.id, roles[item.roleCode].id);

    const existingMember = await prisma.teamMember.findFirst({
      where: {
        tenantId: tenant.id,
        teamId: team.id,
        userId: roleUser.id,
        startedAt: defaultValidFrom,
      },
    });
    if (!existingMember) {
      await prisma.teamMember.create({
        data: {
          tenantId: tenant.id,
          teamId: team.id,
          userId: roleUser.id,
          startedAt: defaultValidFrom,
        },
      });
    }
    createdRoleUsers[item.roleCode] = roleUser;
  }

  if (createSampleEntries) {
    const entriesCount = await prisma.entreeMainCourante.count({
      where: { tenantId: tenant.id, deletedAt: null },
    });

    if (entriesCount === 0) {
      const types = await prisma.typeEvenement.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { id: true, code: true },
      });
      const typeIdByCode = Object.fromEntries(types.map((t) => [t.code, t.id]));

      const actors = [createdRoleUsers.AGENT?.id, createdRoleUsers.CHEF_EQUIPE?.id].filter(Boolean);
      const templates = [
        { code: 'RONDE', description: 'Ronde completee sans anomalie', localisation: 'Niveau 1 - Couloir A', gravite: 'INFO' },
        { code: 'ALARME', description: 'Declenchement detecteur fumee', localisation: 'Sous-sol - Local technique', gravite: 'ELEVEE' },
        { code: 'ANOMALIE', description: 'Porte coupe-feu bloquee ouverte', localisation: 'Escalier B', gravite: 'MOYENNE' },
        { code: 'OBSERVATION', description: 'Extincteur a verifier', localisation: 'Hall principal', gravite: 'FAIBLE' },
        { code: 'INTERVENTION', description: 'Levee de doute effectuee', localisation: 'Parking Ouest', gravite: 'MOYENNE' },
      ];

      const now = Date.now();
      const rows = Array.from({ length: 30 }).map((_, idx) => {
        const tpl = templates[idx % templates.length];
        return {
          tenantId: tenant.id,
          siteId: site.id,
          teamId: team.id,
          userId: actors[idx % actors.length],
          typeEvenementId: typeIdByCode[tpl.code],
          timestamp: new Date(now - idx * 40 * 60 * 1000),
          description: `${tpl.description} (#${idx + 1})`,
          localisation: tpl.localisation,
          gravite: tpl.gravite,
        };
      });

      await prisma.entreeMainCourante.createMany({ data: rows });
      console.log(`Entrees de demo creees: ${rows.length}`);
    }
  }

  console.log('Bootstrap termine.');
  console.log(`Tenant: ${tenant.name} (${tenant.code})`);
  console.log(`Login: ${adminEmail}`);
  console.log(`Mot de passe: ${adminPassword}`);
  console.log('--- Comptes de test supplementaires ---');
  console.log('Patron: patron@demo.local / Patron1234! -> /patron/dashboard');
  console.log('Chef:   chef@demo.local / Chef1234!   -> /chef/dashboard');
  console.log('Agent:  agent@demo.local / Agent1234! -> /agent/dashboard');
  console.log('Client: client@demo.local / Client1234! -> /client/dashboard');
  console.log('URL login: http://localhost:3000/login');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
