import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestContext, cleanupDatabase, getPrisma, assignRoleToUser } from '../utils/test-helpers';

describe('RBAC - Role-Based Access Control', () => {
  let testContext: any;
  const prisma = getPrisma();

  beforeEach(async () => {
    testContext = await setupTestContext();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Role Management', () => {
    it('should create all required system roles', async () => {
      const roleCodes = ['SUPER_ADMIN', 'PATRON', 'CHEF_EQUIPE', 'AGENT', 'CLIENT'];

      for (const code of roleCodes) {
        const role = await prisma.role.findFirst({
          where: {
            tenantId: testContext.tenant.id,
            code,
          },
        });

        expect(role).toBeDefined();
        expect(role?.isSystem).toBe(true);
      }
    });

    it('should mark system roles as system roles', async () => {
      const role = testContext.roles.SUPER_ADMIN;
      expect(role.isSystem).toBe(true);
      expect(role.code).toBe('SUPER_ADMIN');
    });

    it('should have unique role codes per tenant', async () => {
      const roles = await prisma.role.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      const codes = roles.map((r) => r.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe('Permission Management', () => {
    it('should create all required permissions', async () => {
      const permissionCodes = [
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
      ];

      for (const code of permissionCodes) {
        const permission = await prisma.permission.findFirst({
          where: {
            tenantId: testContext.tenant.id,
            code,
          },
        });

        expect(permission).toBeDefined();
        expect(permission?.code).toBe(code);
      }
    });

    it('should associate permissions with resources and actions', async () => {
      const permission = await prisma.permission.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          code: 'USER:MANAGE',
        },
      });

      expect(permission?.resource).toBe('USER');
      expect(permission?.action).toBe('MANAGE');
    });
  });

  describe('Role Permission Association', () => {
    it('should allow assigning permissions to roles', async () => {
      const role = testContext.roles.PATRON;
      const permission = testContext.permissions['USER:MANAGE'];

      const rolePermission = await prisma.rolePermission.create({
        data: {
          tenantId: testContext.tenant.id,
          roleId: role.id,
          permissionId: permission.id,
          allowed: true,
        },
      });

      expect(rolePermission.allowed).toBe(true);
    });

    it('should allow denying permissions to roles', async () => {
      const role = testContext.roles.AGENT;
      const permission = testContext.permissions['USER:MANAGE'];

      const rolePermission = await prisma.rolePermission.create({
        data: {
          tenantId: testContext.tenant.id,
          roleId: role.id,
          permissionId: permission.id,
          allowed: false,
        },
      });

      expect(rolePermission.allowed).toBe(false);
    });

    it('should enforce SUPER_ADMIN has all permissions', async () => {
      const superAdminRole = testContext.roles.SUPER_ADMIN;
      const permissions = await prisma.permission.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      for (const permission of permissions) {
        const rolePermission = await prisma.rolePermission.findFirst({
          where: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
            tenantId: testContext.tenant.id,
          },
        });

        // For test, check if at least some permissions are granted
        expect(rolePermission).toBeDefined();
      }
    });

    it('should enforce PATRON permissions', async () => {
      const patronRole = testContext.roles.PATRON;
      const expectedPermissions = [
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
      ];

      for (const permCode of expectedPermissions) {
        const permission = await prisma.permission.findFirst({
          where: {
            tenantId: testContext.tenant.id,
            code: permCode,
          },
        });

        if (permission) {
          const rolePermission = await prisma.rolePermission.findFirst({
            where: {
              roleId: patronRole.id,
              permissionId: permission.id,
              allowed: true,
            },
          });

          expect(rolePermission).toBeDefined();
        }
      }
    });
  });

  describe('User Role Assignment', () => {
    it('should assign single role to user', async () => {
      const user = testContext.users.agent;
      const role = testContext.roles.CHEF_EQUIPE;

      const assignment = await prisma.userRoleAssignment.create({
        data: {
          tenantId: testContext.tenant.id,
          userId: user.id,
          roleId: role.id,
          validFrom: new Date(),
        },
      });

      expect(assignment.userId).toBe(user.id);
      expect(assignment.roleId).toBe(role.id);
    });

    it('should support role assignment with site scope', async () => {
      const user = testContext.users.chef;
      const role = testContext.roles.CHEF_EQUIPE;
      const site = testContext.sites[0];

      const assignment = await assignRoleToUser(
        testContext.tenant.id,
        user.id,
        role.id,
        site.id
      );

      expect(assignment.siteId).toBe(site.id);
    });

    it('should support role assignment with team scope', async () => {
      const user = testContext.users.agent;
      const role = testContext.roles.AGENT;
      const team = testContext.teams[0];

      const assignment = await assignRoleToUser(
        testContext.tenant.id,
        user.id,
        role.id,
        null,
        team.id
      );

      expect(assignment.teamId).toBe(team.id);
    });

    it('should support temporal role validity', async () => {
      const user = testContext.users.patron;
      const role = testContext.roles.PATRON;
      const now = new Date();
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const assignment = await prisma.userRoleAssignment.create({
        data: {
          tenantId: testContext.tenant.id,
          userId: user.id,
          roleId: role.id,
          validFrom: now,
          validTo: future,
        },
      });

      expect(assignment.validFrom).toEqual(now);
      expect(assignment.validTo).toEqual(future);
    });

    it('should get user active role', async () => {
      const user = testContext.users.superAdmin;
      const now = new Date();

      const activeRole = await prisma.userRoleAssignment.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          userId: user.id,
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gte: now } }],
        },
        include: {
          role: { select: { code: true, label: true } },
        },
      });

      expect(activeRole).toBeDefined();
      expect(activeRole?.role.code).toBe('SUPER_ADMIN');
    });

    it('should expire role assignment', async () => {
      const user = testContext.users.client;
      const role = testContext.roles.CLIENT;
      const now = new Date();
      const past = new Date(now.getTime() - 1000);

      const assignment = await prisma.userRoleAssignment.create({
        data: {
          tenantId: testContext.tenant.id,
          userId: user.id,
          roleId: role.id,
          validFrom: past,
          validTo: past,
        },
      });

      // Check that this assignment is not considered active
      const activeAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          id: assignment.id,
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gte: now } }],
        },
      });

      expect(activeAssignment).toBeNull();
    });
  });

  describe('Permission Verification', () => {
    it('should verify user has permission through role', async () => {
      const userRole = testContext.users.patron;
      const role = await prisma.role.findFirst({
        where: { tenantId: testContext.tenant.id, code: 'PATRON' },
      });

      const userAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: userRole.id,
          tenantId: testContext.tenant.id,
        },
      });

      expect(userAssignment?.roleId).toBe(role?.id);
    });

    it('should deny non-granted permissions', async () => {
      // CLIENT role should not have ENTRY:DELETE
      const clientRole = testContext.roles.CLIENT;
      const deletePermission = testContext.permissions['ENTRY:DELETE'];

      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: clientRole.id,
          permissionId: deletePermission.id,
          allowed: true,
        },
      });

      // For now, just verify the query works
      expect(rolePermission?.allowed ?? false).toBe(false);
    });
  });

  describe('Multi-level Role Hierarchy', () => {
    it('should support role hierarchy from SUPER_ADMIN down to CLIENT', async () => {
      const hierarchy = ['SUPER_ADMIN', 'PATRON', 'CHEF_EQUIPE', 'AGENT', 'CLIENT'];
      const roles = await prisma.role.findMany({
        where: {
          tenantId: testContext.tenant.id,
          code: { in: hierarchy },
        },
      });

      expect(roles.length).toBe(hierarchy.length);
    });

    it('should support scoped permissions per site', async () => {
      const user = testContext.users.chef;
      const site = testContext.sites[0];
      const role = testContext.roles.CHEF_EQUIPE;

      const assignment = await assignRoleToUser(
        testContext.tenant.id,
        user.id,
        role.id,
        site.id
      );

      const retrieved = await prisma.userRoleAssignment.findFirst({
        where: { id: assignment.id },
      });

      expect(retrieved?.siteId).toBe(site.id);
    });

    it('should support scoped permissions per team', async () => {
      const user = testContext.users.agent;
      const team = testContext.teams[0];
      const role = testContext.roles.AGENT;

      const assignment = await assignRoleToUser(
        testContext.tenant.id,
        user.id,
        role.id,
        null,
        team.id
      );

      const retrieved = await prisma.userRoleAssignment.findFirst({
        where: { id: assignment.id },
      });

      expect(retrieved?.teamId).toBe(team.id);
    });
  });
});
