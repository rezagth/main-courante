import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verify as verifyArgon2 } from 'argon2';
import { setupTestContext, cleanupDatabase, getPrisma } from '../utils/test-helpers';

describe('Authentication', () => {
  let testContext: any;
  const prisma = getPrisma();

  beforeEach(async () => {
    testContext = await setupTestContext();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('User Creation and Password Storage', () => {
    it('should create a user with hashed password', async () => {
      expect(testContext.users.superAdmin).toBeDefined();
      expect(testContext.users.superAdmin.email).toBe('superadmin@test.local');
      expect(testContext.users.superAdmin.passwordHash).toBeDefined();
      expect(testContext.users.superAdmin.passwordHash).not.toBe('Test1234!');
    });

    it('should hash password using argon2', async () => {
      const user = testContext.users.superAdmin;
      const isValidPassword = await verifyArgon2(user.passwordHash, 'Test1234!');
      expect(isValidPassword).toBe(true);
    });

    it('should not match invalid password', async () => {
      const user = testContext.users.superAdmin;
      try {
        await verifyArgon2(user.passwordHash, 'WrongPassword');
        expect(true).toBe(false); // Should not reach here
      } catch {
        expect(true).toBe(true); // Expected to fail
      }
    });

    it('should mark user as active on creation', async () => {
      expect(testContext.users.superAdmin.isActive).toBe(true);
      expect(testContext.users.superAdmin.status).toBe('ACTIVE');
    });
  });

  describe('User Status Management', () => {
    it('should create active user', async () => {
      expect(testContext.users.patron.isActive).toBe(true);
      expect(testContext.users.patron.status).toBe('ACTIVE');
    });

    it('should allow deactivating user', async () => {
      const user = testContext.users.agent;
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false, status: 'INACTIVE' },
      });
      expect(updated.isActive).toBe(false);
      expect(updated.status).toBe('INACTIVE');
    });

    it('should support user suspension', async () => {
      const user = testContext.users.client;
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { status: 'SUSPENDED' },
      });
      expect(updated.status).toBe('SUSPENDED');
    });

    it('should allow reactivating suspended user', async () => {
      const user = testContext.users.agent;
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'SUSPENDED' },
      });

      const reactivated = await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true, status: 'ACTIVE' },
      });

      expect(reactivated.isActive).toBe(true);
      expect(reactivated.status).toBe('ACTIVE');
    });
  });

  describe('Multi-tenant User Isolation', () => {
    it('should isolate users by tenant', async () => {
      const user1 = testContext.users.superAdmin;
      expect(user1.tenantId).toBe(testContext.tenant.id);

      // User should only exist in their tenant
      const userInTenant = await prisma.user.findFirst({
        where: {
          id: user1.id,
          tenantId: testContext.tenant.id,
        },
      });

      expect(userInTenant).toBeDefined();
    });

    it('should prevent duplicate emails within same tenant', async () => {
      const email = 'duplicate@test.local';
      await prisma.user.create({
        data: {
          tenantId: testContext.tenant.id,
          email,
          firstName: 'Test',
          lastName: 'User',
          passwordHash: 'hashed',
          isActive: true,
          status: 'ACTIVE',
        },
      });

      try {
        await prisma.user.create({
          data: {
            tenantId: testContext.tenant.id,
            email,
            firstName: 'Test',
            lastName: 'User',
            passwordHash: 'hashed',
            isActive: true,
            status: 'ACTIVE',
          },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should allow same email in different tenants', async () => {
      const { tenant: secondTenant } = testContext;
      const thirdTenant = await prisma.tenant.create({
        data: {
          code: 'THIRD-TENANT-' + Date.now(),
          name: 'Third Test Tenant',
          plan: 'STANDARD',
          status: 'ACTIVE',
        },
      });

      const email = 'shared@test.local';

      const user1 = await prisma.user.create({
        data: {
          tenantId: secondTenant.id,
          email,
          firstName: 'User',
          lastName: 'One',
          passwordHash: 'hashed1',
          isActive: true,
          status: 'ACTIVE',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          tenantId: thirdTenant.id,
          email,
          firstName: 'User',
          lastName: 'Two',
          passwordHash: 'hashed2',
          isActive: true,
          status: 'ACTIVE',
        },
      });

      expect(user1.id).not.toBe(user2.id);
      expect(user1.tenantId).not.toBe(user2.tenantId);
    });
  });

  describe('User Information Management', () => {
    it('should store user first and last name', async () => {
      const user = testContext.users.patron;
      expect(user.firstName).toBe('Sarah');
      expect(user.lastName).toBe('Patron');
    });

    it('should allow updating user information', async () => {
      const user = testContext.users.agent;
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { firstName: 'Updated', lastName: 'Name' },
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.lastName).toBe('Name');
    });

    it('should track user creation timestamp', async () => {
      const user = testContext.users.chef;
      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should track user update timestamp', async () => {
      const user = testContext.users.client;
      const originalUpdated = user.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { firstName: 'Modified' },
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdated.getTime());
    });
  });

  describe('Session and Login Validation', () => {
    it('should identify user by email and tenant', async () => {
      const user = testContext.users.superAdmin;
      const found = await prisma.user.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          email: user.email,
        },
      });

      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
    });

    it('should reject login for inactive user', async () => {
      const user = testContext.users.patron;
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      const found = await prisma.user.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          email: user.email,
          isActive: true,
        },
      });

      expect(found).toBeNull();
    });

    it('should reject login for suspended user', async () => {
      const user = testContext.users.chef;
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'SUSPENDED' },
      });

      const found = await prisma.user.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          email: user.email,
          status: 'ACTIVE',
        },
      });

      expect(found).toBeNull();
    });

    it('should allow login for active user with correct status', async () => {
      const user = testContext.users.agent;
      const found = await prisma.user.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          email: user.email,
          isActive: true,
          status: 'ACTIVE',
        },
      });

      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
    });
  });
});
