// prisma/seed.test.ts - Test seed pour populating test database

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
  adapter: new PrismaPg(pool as any),
});

export async function seedTestDatabase() {
  console.log('🌱 Seeding test database...');

  // Clean existing data
  await prisma.$executeRawUnsafe(`
    DELETE FROM "team_members" WHERE 1=1;
    DELETE FROM "user_role_assignments" WHERE 1=1;
    DELETE FROM "role_permissions" WHERE 1=1;
    DELETE FROM "entrees_main_courante" WHERE 1=1;
    DELETE FROM "types_evenement" WHERE 1=1;
    DELETE FROM "teams" WHERE 1=1;
    DELETE FROM "sites" WHERE 1=1;
    DELETE FROM "permissions" WHERE 1=1;
    DELETE FROM "roles" WHERE 1=1;
    DELETE FROM "users" WHERE 1=1;
    DELETE FROM "tenants" WHERE 1=1;
  `);

  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      code: 'TEST-SUITE',
      name: 'Test Suite Tenant',
      plan: 'STANDARD',
      status: 'ACTIVE',
      quotas: {
        create: {
          maxActiveUsers: 100,
          maxEntriesPerMonth: 50000,
          maxStorageGb: 100,
        },
      },
      retentionPolicy: {
        create: {
          activeYears: 2,
          archiveYears: 7,
        },
      },
    },
  });

  console.log('✅ Tenant created:', tenant.code);

  // Create roles
  const roleDefs = [
    { code: 'SUPER_ADMIN', label: 'Super Admin' },
    { code: 'PATRON', label: 'Patron' },
    { code: 'CHEF_EQUIPE', label: "Chef d'équipe" },
    { code: 'AGENT', label: 'Agent' },
    { code: 'CLIENT', label: 'Client' },
  ];

  const roles: any = {};
  for (const def of roleDefs) {
    roles[def.code] = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        code: def.code,
        label: def.label,
        isSystem: true,
      },
    });
  }

  console.log('✅ Roles created:', Object.keys(roles).length);

  // Create permissions
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

  const permissions: any = {};
  for (const def of permissionDefs) {
    permissions[def.code] = await prisma.permission.create({
      data: {
        tenantId: tenant.id,
        resource: def.resource,
        action: def.action,
        code: def.code,
      },
    });
  }

  console.log('✅ Permissions created:', Object.keys(permissions).length);

  // Assign permissions to roles
  for (const item of permissionDefs) {
    const permission = permissions[item.code];

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
          [
            'ENTRY:CREATE',
            'ENTRY:READ',
            'ENTRY:UPDATE',
            'ENTRY:EXPORT',
            'TYPE_EVENT:MANAGE',
            'USER:READ',
          ].includes(item.code)) ||
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

  console.log('✅ Role-Permission assignments created');

  // Create sites
  const site = await prisma.site.create({
    data: {
      tenantId: tenant.id,
      code: 'SITE-TEST-1',
      name: 'Test Site 1',
      address: '123 Test Street',
    },
  });

  console.log('✅ Sites created');

  // Create teams
  const team = await prisma.team.create({
    data: {
      tenantId: tenant.id,
      siteId: site.id,
      code: 'TEAM-TEST-A',
      name: 'Test Team A',
    },
  });

  console.log('✅ Teams created');

  // Create event types
  const eventTypes = await Promise.all([
    prisma.typeEvenement.create({
      data: {
        tenantId: tenant.id,
        code: 'RONDE',
        label: 'Ronde',
      },
    }),
    prisma.typeEvenement.create({
      data: {
        tenantId: tenant.id,
        code: 'ALARME',
        label: 'Alarme',
      },
    }),
    prisma.typeEvenement.create({
      data: {
        tenantId: tenant.id,
        code: 'ANOMALIE',
        label: 'Anomalie',
      },
    }),
  ]);

  console.log('✅ Event types created:', eventTypes.length);

  console.log('🌱 Test database seeded successfully!');

  return { tenant, roles, permissions, site, team, eventTypes };
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedTestDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
