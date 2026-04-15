import { PrismaClient } from '@prisma/client';
import { hash as hashArgon2 } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prismaInstance: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });

    prismaInstance = new PrismaClient({
      adapter: new PrismaPg(pool as any),
    });
  }

  return prismaInstance;
}

export async function cleanupDatabase() {
  const prisma = getPrisma();
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
}

export async function createTestTenant() {
  const prisma = getPrisma();
  return await prisma.tenant.create({
    data: {
      code: 'TEST-TENANT-' + Date.now(),
      name: 'Test Tenant ' + Date.now(),
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
}

export async function createTestRoles(tenantId: string) {
  const prisma = getPrisma();
  const roles: any = {};

  const roleDefs = [
    { code: 'SUPER_ADMIN', label: 'Super Admin' },
    { code: 'PATRON', label: 'Patron' },
    { code: 'CHEF_EQUIPE', label: "Chef d'équipe" },
    { code: 'AGENT', label: 'Agent' },
    { code: 'CLIENT', label: 'Client' },
  ];

  for (const def of roleDefs) {
    roles[def.code] = await prisma.role.create({
      data: {
        tenantId,
        code: def.code,
        label: def.label,
        isSystem: true,
      },
    });
  }

  return roles;
}

export async function createTestPermissions(tenantId: string) {
  const prisma = getPrisma();
  const permissions: any = {};

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

  for (const def of permissionDefs) {
    permissions[def.code] = await prisma.permission.create({
      data: {
        tenantId,
        resource: def.resource,
        action: def.action,
        code: def.code,
      },
    });
  }

  return permissions;
}

export async function createTestUser(
  tenantId: string,
  email: string,
  password: string = 'TestPassword123!',
  firstName: string = 'Test',
  lastName: string = 'User',
  roleCode?: string,
  roles?: any
) {
  const prisma = getPrisma();
  const passwordHash = await hashArgon2(password);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email,
      firstName,
      lastName,
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  if (roleCode && roles && roles[roleCode]) {
    await prisma.userRoleAssignment.create({
      data: {
        tenantId,
        userId: user.id,
        roleId: roles[roleCode].id,
        validFrom: new Date(),
      },
    });
  }

  return user;
}

export async function assignRoleToUser(
  tenantId: string,
  userId: string,
  roleId: string,
  siteId?: string | null,
  teamId?: string | null
) {
  const prisma = getPrisma();
  return await prisma.userRoleAssignment.create({
    data: {
      tenantId,
      userId,
      roleId,
      siteId: siteId ?? null,
      teamId: teamId ?? null,
      validFrom: new Date(),
    },
  });
}

export async function createTestSite(tenantId: string, code: string = 'SITE-TEST', name: string = 'Test Site') {
  const prisma = getPrisma();
  return await prisma.site.create({
    data: {
      tenantId,
      code,
      name,
      address: '123 Test Street, Test City',
    },
  });
}

export async function createTestTeam(tenantId: string, siteId: string, code: string = 'TEAM-TEST', name: string = 'Test Team') {
  const prisma = getPrisma();
  return await prisma.team.create({
    data: {
      tenantId,
      siteId,
      code,
      name,
    },
  });
}

export async function createTestEntry(
  tenantId: string,
  siteId: string,
  teamId: string,
  userId: string,
  typeEvenementId: string,
  description: string = 'Test Entry'
) {
  const prisma = getPrisma();
  return await prisma.entreeMainCourante.create({
    data: {
      tenantId,
      siteId,
      teamId,
      userId,
      typeEvenementId,
      timestamp: new Date(),
      description,
      localisation: 'Test Location',
      gravite: 'MOYENNE',
    },
  });
}

export async function createTestEventType(tenantId: string, code: string, label: string) {
  const prisma = getPrisma();
  return await prisma.typeEvenement.create({
    data: {
      tenantId,
      code,
      label,
    },
  });
}

export interface TestContext {
  tenant: any;
  roles: any;
  permissions: any;
  users: {
    superAdmin?: any;
    patron?: any;
    chef?: any;
    agent?: any;
    client?: any;
  };
  sites: any[];
  teams: any[];
  eventTypes: any[];
}

export async function setupTestContext(): Promise<TestContext> {
  const tenant = await createTestTenant();
  const roles = await createTestRoles(tenant.id);
  const permissions = await createTestPermissions(tenant.id);

  // Create test users for each role
  const users = {
    superAdmin: await createTestUser(tenant.id, 'superadmin@test.local', 'Test1234!', 'Super', 'Admin', 'SUPER_ADMIN', roles),
    patron: await createTestUser(tenant.id, 'patron@test.local', 'Test1234!', 'Sarah', 'Patron', 'PATRON', roles),
    chef: await createTestUser(tenant.id, 'chef@test.local', 'Test1234!', 'Nora', 'Chef', 'CHEF_EQUIPE', roles),
    agent: await createTestUser(tenant.id, 'agent@test.local', 'Test1234!', 'Ali', 'Agent', 'AGENT', roles),
    client: await createTestUser(tenant.id, 'client@test.local', 'Test1234!', 'Lea', 'Client', 'CLIENT', roles),
  };

  // Create test sites and teams
  const site = await createTestSite(tenant.id);
  const sites = [site];

  const team = await createTestTeam(tenant.id, site.id);
  const teams = [team];

  // Create event types
  const eventTypes = await Promise.all([
    createTestEventType(tenant.id, 'RONDE', 'Ronde'),
    createTestEventType(tenant.id, 'ALARME', 'Alarme'),
    createTestEventType(tenant.id, 'ANOMALIE', 'Anomalie'),
  ]);

  return {
    tenant,
    roles,
    permissions,
    users,
    sites,
    teams,
    eventTypes,
  };
}
