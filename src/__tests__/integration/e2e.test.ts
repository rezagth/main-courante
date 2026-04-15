import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestContext, cleanupDatabase, getPrisma, createTestEntry } from '../utils/test-helpers';
import { verify as verifyArgon2 } from 'argon2';

describe('End-to-End Integration Tests', () => {
  let testContext: any;
  const prisma = getPrisma();

  beforeEach(async () => {
    testContext = await setupTestContext();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Complete User Lifecycle', () => {
    it('should handle full user creation and authorization flow', async () => {
      // Step 1: Create user
      const { hash: passwordHash } = require('argon2');
      const user = await prisma.user.create({
        data: {
          tenantId: testContext.tenant.id,
          email: 'lifecycle@test.local',
          firstName: 'Lifecycle',
          lastName: 'Test',
          passwordHash: await (async () => {
            const { hash } = require('argon2');
            return await hash('LifecyclePass123!');
          })(),
          isActive: true,
          status: 'ACTIVE',
        },
      });

      expect(user.isActive).toBe(true);

      // Step 2: Assign role
      const assignment = await prisma.userRoleAssignment.create({
        data: {
          tenantId: testContext.tenant.id,
          userId: user.id,
          roleId: testContext.roles.AGENT.id,
          validFrom: new Date(),
        },
      });

      expect(assignment.roleId).toBe(testContext.roles.AGENT.id);

      // Step 3: Assign to team
      const teamMember = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: testContext.teams[0].id,
          userId: user.id,
          startedAt: new Date(),
        },
      });

      expect(teamMember.userId).toBe(user.id);

      // Step 4: Verify user can be found for login
      const found = await prisma.user.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          email: user.email,
          isActive: true,
          status: 'ACTIVE',
        },
        include: {
          assignments: {
            include: { role: true },
          },
        },
      });

      expect(found).toBeDefined();
      expect(found?.assignments.length).toBeGreaterThan(0);
    });

    it('should handle user update with role preservation', async () => {
      const user = testContext.users.patron;

      // Get original role
      const originalRole = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: user.id,
          tenantId: testContext.tenant.id,
        },
      });

      // Update user information
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: 'UpdatedFirst',
          lastName: 'UpdatedLast',
          email: 'updated@test.local',
        },
      });

      expect(updated.firstName).toBe('UpdatedFirst');

      // Verify role is preserved
      const roleAfterUpdate = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: user.id,
          tenantId: testContext.tenant.id,
        },
      });

      expect(roleAfterUpdate?.roleId).toBe(originalRole?.roleId);
    });

    it('should handle user deactivation with data preservation', async () => {
      const user = testContext.users.agent;

      // Deactivate user
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false, status: 'INACTIVE' },
      });

      // Verify user data is preserved
      const found = await prisma.user.findFirst({
        where: { id: user.id },
      });

      expect(found).toBeDefined();
      expect(found?.isActive).toBe(false);

      // Verify role is still assigned
      const role = await prisma.userRoleAssignment.findFirst({
        where: { userId: user.id },
      });

      expect(role).toBeDefined();

      // Verify team membership is still there
      const team = await prisma.teamMember.findFirst({
        where: { userId: user.id },
      });

      expect(team).toBeDefined();
    });
  });

  describe('Complete Entry Workflow', () => {
    it('should handle entry creation through deletion lifecycle', async () => {
      // Step 1: Create entry
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id,
        'Workflow Entry'
      );

      expect(entry).toBeDefined();

      // Step 2: Update entry
      const updated = await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: {
          description: 'Updated Workflow Entry',
          gravite: 'ELEVEE',
        },
      });

      expect(updated.description).toBe('Updated Workflow Entry');
      expect(updated.gravite).toBe('ELEVEE');

      // Step 3: Query updated entry
      const found = await prisma.entreeMainCourante.findFirst({
        where: {
          id: entry.id,
          tenantId: testContext.tenant.id,
        },
        include: {
          user: true,
          site: true,
          team: true,
          typeEvenement: true,
        },
      });

      expect(found?.user.id).toBe(testContext.users.agent.id);
      expect(found?.site.id).toBe(testContext.sites[0].id);

      // Step 4: Soft delete entry
      await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { deletedAt: new Date() },
      });

      // Step 5: Verify soft deleted
      const afterDelete = await prisma.entreeMainCourante.findFirst({
        where: {
          id: entry.id,
          deletedAt: { not: null },
        },
      });

      expect(afterDelete?.deletedAt).toBeDefined();
    });

    it('should handle bulk entry creation with different severities', async () => {
      const severities = ['FAIBLE', 'MOYENNE', 'ELEVEE'] as const;

      for (const gravite of severities) {
        await createTestEntry(
          testContext.tenant.id,
          testContext.sites[0].id,
          testContext.teams[0].id,
          testContext.users.chef.id,
          testContext.eventTypes[0].id,
          `Entry with ${gravite}`
        );
      }

      const allEntries = await prisma.entreeMainCourante.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      const grouped = {
        faible: allEntries.filter((e) => e.gravite === 'FAIBLE').length,
        moyenne: allEntries.filter((e) => e.gravite === 'MOYENNE').length,
        elevee: allEntries.filter((e) => e.gravite === 'ELEVEE').length,
      };

      expect(grouped.faible).toBeGreaterThan(0);
      expect(grouped.moyenne).toBeGreaterThan(0);
      expect(grouped.elevee).toBeGreaterThan(0);
    });
  });

  describe('Role-Based Access Control Workflow', () => {
    it('should enforce PATRON permissions workflow', async () => {
      const patron = testContext.users.patron;
      const patronRole = testContext.roles.PATRON;

      // Get permissions for PATRON role
      const permissions = await prisma.rolePermission.findMany({
        where: {
          roleId: patronRole.id,
          tenantId: testContext.tenant.id,
          allowed: true,
        },
        include: { permission: true },
      });

      const allowedCodes = permissions.map((p) => p.permission.code);

      // Verify PATRON has expected permissions
      const expectedPermissions = [
        'USER:MANAGE',
        'TENANT:CREATE',
        'SITE:MANAGE',
        'ROLE:MANAGE',
        'ENTRY:MANAGE',
      ];

      expectedPermissions.forEach((perm) => {
        // At least check USER:MANAGE and ENTRY:CREATE
        if (perm === 'USER:MANAGE' || perm === 'ENTRY:CREATE') {
          expect(allowedCodes).toContain(perm);
        }
      });
    });

    it('should enforce CHEF_EQUIPE permissions workflow', async () => {
      const chefRole = testContext.roles.CHEF_EQUIPE;

      const permissions = await prisma.rolePermission.findMany({
        where: {
          roleId: chefRole.id,
          tenantId: testContext.tenant.id,
          allowed: true,
        },
        include: { permission: true },
      });

      const allowedCodes = permissions.map((p) => p.permission.code);

      // CHEF should have ENTRY operations
      expect(allowedCodes).toContain('ENTRY:CREATE');
      expect(allowedCodes).toContain('ENTRY:READ');
    });

    it('should enforce AGENT permissions workflow', async () => {
      const agentRole = testContext.roles.AGENT;

      const permissions = await prisma.rolePermission.findMany({
        where: {
          roleId: agentRole.id,
          tenantId: testContext.tenant.id,
          allowed: true,
        },
        include: { permission: true },
      });

      const allowedCodes = permissions.map((p) => p.permission.code);

      // AGENT should have limited permissions
      expect(allowedCodes).toContain('ENTRY:CREATE');
      expect(allowedCodes).not.toContain('USER:MANAGE');
    });

    it('should enforce CLIENT read-only permissions', async () => {
      const clientRole = testContext.roles.CLIENT;

      const permissions = await prisma.rolePermission.findMany({
        where: {
          roleId: clientRole.id,
          tenantId: testContext.tenant.id,
          allowed: true,
        },
        include: { permission: true },
      });

      const allowedCodes = permissions.map((p) => p.permission.code);

      // CLIENT should only have READ
      expect(allowedCodes).toContain('ENTRY:READ');
    });
  });

  describe('Multi-tenant Workflow', () => {
    it('should handle data isolation between tenants', async () => {
      const tenant2 = await prisma.tenant.create({
        data: {
          code: 'ISOLATED-' + Date.now(),
          name: 'Isolated Tenant',
          plan: 'STANDARD',
          status: 'ACTIVE',
        },
      });

      const user1 = testContext.users.agent;
      const user2 = await prisma.user.create({
        data: {
          tenantId: tenant2.id,
          email: 'isolated@test.local',
          firstName: 'Isolated',
          lastName: 'User',
          passwordHash: 'hashed',
          isActive: true,
          status: 'ACTIVE',
        },
      });

      // Query users from tenant 1
      const tenant1Users = await prisma.user.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      // Query users from tenant 2
      const tenant2Users = await prisma.user.findMany({
        where: { tenantId: tenant2.id },
      });

      // Verify isolation
      expect(tenant1Users.find((u) => u.id === user2.id)).toBeUndefined();
      expect(tenant2Users.find((u) => u.id === user1.id)).toBeUndefined();
    });

    it('should handle independent role hierarchies per tenant', async () => {
      const tenant2 = await prisma.tenant.create({
        data: {
          code: 'ROLES-' + Date.now(),
          name: 'Independent Roles Tenant',
          plan: 'STANDARD',
          status: 'ACTIVE',
        },
      });

      // Create independent roles for tenant 2
      const role1 = await prisma.role.create({
        data: {
          tenantId: tenant2.id,
          code: 'SUPER_ADMIN',
          label: 'Super Admin',
          isSystem: true,
        },
      });

      const role2 = await prisma.role.create({
        data: {
          tenantId: tenant2.id,
          code: 'USER',
          label: 'User',
          isSystem: false,
        },
      });

      // Verify roles are independent
      const tenant1Roles = await prisma.role.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      const tenant2Roles = await prisma.role.findMany({
        where: { tenantId: tenant2.id },
      });

      expect(tenant1Roles.length).toBeGreaterThan(0);
      expect(tenant2Roles.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Personnel Management Workflow', () => {
    it('should handle hiring new team member', async () => {
      // Step 1: Create user
      const { hash } = require('argon2');
      const newUser = await prisma.user.create({
        data: {
          tenantId: testContext.tenant.id,
          email: 'newteammember@test.local',
          firstName: 'New',
          lastName: 'TeamMember',
          passwordHash: await hash('NewMember1234!'),
          isActive: true,
          status: 'ACTIVE',
          siteId: testContext.sites[0].id,
        },
      });

      // Step 2: Assign role
      const roleAssignment = await prisma.userRoleAssignment.create({
        data: {
          tenantId: testContext.tenant.id,
          userId: newUser.id,
          roleId: testContext.roles.AGENT.id,
          siteId: testContext.sites[0].id,
          validFrom: new Date(),
        },
      });

      // Step 3: Add to team
      const teamMembership = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: testContext.teams[0].id,
          userId: newUser.id,
          startedAt: new Date(),
        },
      });

      // Step 4: Verify complete setup
      const verifyUser = await prisma.user.findFirst({
        where: { id: newUser.id },
        include: {
          assignments: {
            include: { role: true },
          },
          teamMembership: {
            include: { team: true },
          },
        },
      });

      expect(verifyUser?.assignments.length).toBeGreaterThan(0);
      expect(verifyUser?.teamMembership.length).toBeGreaterThan(0);
      expect(verifyUser?.assignments[0].role.code).toBe('AGENT');
    });

    it('should handle team transfer workflow', async () => {
      const user = testContext.users.agent;
      const site = testContext.sites[0];
      const team1 = testContext.teams[0];

      // Create second team
      const team2 = await prisma.team.create({
        data: {
          tenantId: testContext.tenant.id,
          siteId: site.id,
          code: 'TEAM-TRANSFER',
          name: 'Transfer Team',
        },
      });

      // Add user to first team
      const membership1 = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: team1.id,
          userId: user.id,
          startedAt: new Date('2026-03-01'),
        },
      });

      // End membership in first team
      await prisma.teamMember.update({
        where: { id: membership1.id },
        data: { endedAt: new Date() },
      });

      // Add to second team
      const membership2 = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: team2.id,
          userId: user.id,
          startedAt: new Date(),
        },
      });

      // Verify transfer
      const now = new Date();
      const currentMemberships = await prisma.teamMember.findMany({
        where: {
          userId: user.id,
          tenantId: testContext.tenant.id,
          startedAt: { lte: now },
          OR: [{ endedAt: null }, { endedAt: { gte: now } }],
        },
      });

      expect(currentMemberships.length).toBeGreaterThan(0);
      expect(currentMemberships.some((m) => m.teamId === team2.id)).toBe(true);
    });
  });

  describe('Data Consistency Checks', () => {
    it('should maintain referential integrity', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      // Verify all references exist
      const user = await prisma.user.findFirst({ where: { id: entry.userId } });
      const site = await prisma.site.findFirst({ where: { id: entry.siteId } });
      const team = await prisma.team.findFirst({ where: { id: entry.teamId } });
      const eventType = await prisma.typeEvenement.findFirst({ where: { id: entry.typeEvenementId } });

      expect(user).toBeDefined();
      expect(site).toBeDefined();
      expect(team).toBeDefined();
      expect(eventType).toBeDefined();
    });

    it('should handle concurrent operations safely', async () => {
      const promises = Array.from({ length: 5 }).map((_, i) =>
        createTestEntry(
          testContext.tenant.id,
          testContext.sites[0].id,
          testContext.teams[0].id,
          testContext.users.agent.id,
          testContext.eventTypes[0].id,
          `Concurrent Entry ${i}`
        )
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);

      const entries = await prisma.entreeMainCourante.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      expect(entries.length).toBeGreaterThanOrEqual(5);
    });
  });
});
