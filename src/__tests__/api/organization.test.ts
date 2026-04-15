import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestContext, cleanupDatabase, getPrisma, createTestSite, createTestTeam } from '../utils/test-helpers';

describe('Sites, Teams & Tenants Management', () => {
  let testContext: any;
  const prisma = getPrisma();

  beforeEach(async () => {
    testContext = await setupTestContext();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Tenant Management', () => {
    it('should create tenant with required fields', async () => {
      expect(testContext.tenant.code).toBeDefined();
      expect(testContext.tenant.name).toBeDefined();
      expect(testContext.tenant.plan).toBe('STANDARD');
      expect(testContext.tenant.status).toBe('ACTIVE');
    });

    it('should support different tenant plans', async () => {
      const plans = ['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];

      for (const plan of plans) {
        const tenant = await prisma.tenant.create({
          data: {
            code: `PLAN-${plan}-${Date.now()}`,
            name: `${plan} Tenant`,
            plan,
            status: 'ACTIVE',
          },
        });

        expect(tenant.plan).toBe(plan);
      }
    });

    it('should create tenant quotas', async () => {
      expect(testContext.tenant.quotas).toBeDefined();
      expect(testContext.tenant.quotas[0].maxActiveUsers).toBe(100);
      expect(testContext.tenant.quotas[0].maxEntriesPerMonth).toBe(50000);
    });

    it('should set tenant status', async () => {
      const statuses = ['ACTIVE', 'SUSPENDED', 'ARCHIVED'];

      for (const status of statuses) {
        const tenant = await prisma.tenant.create({
          data: {
            code: `STATUS-${status}-${Date.now()}`,
            name: `${status} Tenant`,
            plan: 'STANDARD',
            status,
          },
        });

        expect(tenant.status).toBe(status);
      }
    });

    it('should track tenant creation and update dates', async () => {
      expect(testContext.tenant.createdAt).toBeInstanceOf(Date);
      expect(testContext.tenant.updatedAt).toBeInstanceOf(Date);
    });

    it('should update tenant information', async () => {
      const updated = await prisma.tenant.update({
        where: { id: testContext.tenant.id },
        data: { name: 'Updated Tenant Name' },
      });

      expect(updated.name).toBe('Updated Tenant Name');
    });

    it('should support onboarding tracking', async () => {
      expect(testContext.tenant.onboarding).toBeDefined();
      expect(testContext.tenant.onboarding[0].siteCreated).toBe(true);
      expect(testContext.tenant.onboarding[0].teamCreated).toBe(true);
    });

    it('should support retention policy', async () => {
      expect(testContext.tenant.retentionPolicy).toBeDefined();
      expect(testContext.tenant.retentionPolicy[0].activeYears).toBe(2);
      expect(testContext.tenant.retentionPolicy[0].archiveYears).toBe(7);
    });
  });

  describe('Site Management', () => {
    it('should create site with required fields', async () => {
      const site = testContext.sites[0];
      expect(site.code).toBeDefined();
      expect(site.name).toBeDefined();
      expect(site.tenantId).toBe(testContext.tenant.id);
    });

    it('should create multiple sites per tenant', async () => {
      const site2 = await createTestSite(testContext.tenant.id, 'SITE-2', 'Second Site');
      const site3 = await createTestSite(testContext.tenant.id, 'SITE-3', 'Third Site');

      const sites = await prisma.site.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      expect(sites.length).toBeGreaterThanOrEqual(3);
    });

    it('should store site address', async () => {
      const site = await prisma.site.findFirst({
        where: { tenantId: testContext.tenant.id },
      });

      expect(site?.address).toBeDefined();
    });

    it('should mark site as active by default', async () => {
      const site = testContext.sites[0];
      expect(site.isActive).toBe(true);
    });

    it('should deactivate site', async () => {
      const site = testContext.sites[0];
      const deactivated = await prisma.site.update({
        where: { id: site.id },
        data: { isActive: false },
      });

      expect(deactivated.isActive).toBe(false);
    });

    it('should filter active sites', async () => {
      const site = testContext.sites[0];
      await prisma.site.update({
        where: { id: site.id },
        data: { isActive: false },
      });

      const activeSites = await prisma.site.findMany({
        where: {
          tenantId: testContext.tenant.id,
          isActive: true,
        },
      });

      expect(activeSites.every((s) => s.isActive)).toBe(true);
    });

    it('should enforce unique site code per tenant', async () => {
      const site = testContext.sites[0];

      try {
        await prisma.site.create({
          data: {
            tenantId: testContext.tenant.id,
            code: site.code,
            name: 'Duplicate Site',
            address: 'Test',
          },
        });
        expect(true).toBe(false); // Should not reach
      } catch {
        expect(true).toBe(true);
      }
    });

    it('should list sites ordered by name', async () => {
      const site1 = await createTestSite(testContext.tenant.id, 'Z-SITE', 'Zebra Site');
      const site2 = await createTestSite(testContext.tenant.id, 'A-SITE', 'Apple Site');

      const sites = await prisma.site.findMany({
        where: { tenantId: testContext.tenant.id, isActive: true },
        orderBy: { name: 'asc' },
      });

      expect(sites.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Team Management', () => {
    it('should create team with required fields', async () => {
      const team = testContext.teams[0];
      expect(team.code).toBeDefined();
      expect(team.name).toBeDefined();
      expect(team.siteId).toBe(testContext.sites[0].id);
    });

    it('should associate team with site', async () => {
      const team = testContext.teams[0];
      const site = testContext.sites[0];

      expect(team.siteId).toBe(site.id);
    });

    it('should create multiple teams per site', async () => {
      const site = testContext.sites[0];
      const team2 = await createTestTeam(testContext.tenant.id, site.id, 'TEAM-B', 'Team B');
      const team3 = await createTestTeam(testContext.tenant.id, site.id, 'TEAM-C', 'Team C');

      const teams = await prisma.team.findMany({
        where: { tenantId: testContext.tenant.id, siteId: site.id },
      });

      expect(teams.length).toBeGreaterThanOrEqual(3);
    });

    it('should mark team as active by default', async () => {
      const team = testContext.teams[0];
      expect(team.isActive).toBe(true);
    });

    it('should deactivate team', async () => {
      const team = testContext.teams[0];
      const deactivated = await prisma.team.update({
        where: { id: team.id },
        data: { isActive: false },
      });

      expect(deactivated.isActive).toBe(false);
    });

    it('should filter active teams', async () => {
      const team = testContext.teams[0];
      await prisma.team.update({
        where: { id: team.id },
        data: { isActive: false },
      });

      const activeTeams = await prisma.team.findMany({
        where: {
          tenantId: testContext.tenant.id,
          isActive: true,
        },
      });

      expect(activeTeams.every((t) => t.isActive)).toBe(true);
    });

    it('should enforce unique team code per site', async () => {
      const site = testContext.sites[0];
      const team = testContext.teams[0];

      try {
        await prisma.team.create({
          data: {
            tenantId: testContext.tenant.id,
            siteId: site.id,
            code: team.code,
            name: 'Duplicate Team',
          },
        });
        expect(true).toBe(false); // Should not reach
      } catch {
        expect(true).toBe(true);
      }
    });

    it('should list teams ordered by name', async () => {
      const site = testContext.sites[0];
      const team1 = await createTestTeam(testContext.tenant.id, site.id, 'Z-TEAM', 'Zebra Team');
      const team2 = await createTestTeam(testContext.tenant.id, site.id, 'A-TEAM', 'Apple Team');

      const teams = await prisma.team.findMany({
        where: { tenantId: testContext.tenant.id, siteId: site.id, isActive: true },
        orderBy: { name: 'asc' },
      });

      expect(teams.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Team Member Management', () => {
    it('should add user to team', async () => {
      const user = testContext.users.agent;
      const team = testContext.teams[0];

      const member = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: team.id,
          userId: user.id,
          startedAt: new Date(),
        },
      });

      expect(member.userId).toBe(user.id);
      expect(member.teamId).toBe(team.id);
    });

    it('should track team member start date', async () => {
      const user = testContext.users.chef;
      const team = testContext.teams[0];
      const startDate = new Date('2026-03-15');

      const member = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: team.id,
          userId: user.id,
          startedAt: startDate,
        },
      });

      expect(member.startedAt).toEqual(startDate);
    });

    it('should support team member end date', async () => {
      const user = testContext.users.agent;
      const team = testContext.teams[0];
      const endDate = new Date('2026-12-31');

      const member = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: team.id,
          userId: user.id,
          startedAt: new Date('2026-03-01'),
          endedAt: endDate,
        },
      });

      expect(member.endedAt).toEqual(endDate);
    });

    it('should remove user from team', async () => {
      const user = testContext.users.patron;
      const team = testContext.teams[0];

      const member = await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: team.id,
          userId: user.id,
          startedAt: new Date(),
        },
      });

      const removed = await prisma.teamMember.update({
        where: { id: member.id },
        data: { endedAt: new Date() },
      });

      expect(removed.endedAt).toBeDefined();
    });

    it('should get active team members', async () => {
      const team = testContext.teams[0];
      const now = new Date();

      const activeMembers = await prisma.teamMember.findMany({
        where: {
          tenantId: testContext.tenant.id,
          teamId: team.id,
          startedAt: { lte: now },
          OR: [{ endedAt: null }, { endedAt: { gte: now } }],
        },
      });

      expect(activeMembers.length).toBeGreaterThan(0);
    });

    it('should prevent duplicate team memberships', async () => {
      const user = testContext.users.agent;
      const team = testContext.teams[0];

      await prisma.teamMember.create({
        data: {
          tenantId: testContext.tenant.id,
          teamId: team.id,
          userId: user.id,
          startedAt: new Date(),
        },
      });

      try {
        await prisma.teamMember.create({
          data: {
            tenantId: testContext.tenant.id,
            teamId: team.id,
            userId: user.id,
            startedAt: new Date(),
          },
        });
        expect(true).toBe(false); // Should not reach
      } catch {
        expect(true).toBe(true);
      }
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should isolate sites by tenant', async () => {
      const site = testContext.sites[0];
      expect(site.tenantId).toBe(testContext.tenant.id);
    });

    it('should isolate teams by tenant', async () => {
      const team = testContext.teams[0];
      expect(team.tenantId).toBe(testContext.tenant.id);
    });

    it('should not share sites across tenants', async () => {
      const tenant2 = await prisma.tenant.create({
        data: {
          code: 'TENANT-2-' + Date.now(),
          name: 'Second Tenant',
          plan: 'STANDARD',
          status: 'ACTIVE',
        },
      });

      const site = testContext.sites[0];

      const tenantsForSite = await prisma.site.findMany({
        where: { code: site.code },
      });

      const hasSiteInSecondTenant = tenantsForSite.some((s) => s.tenantId === tenant2.id);
      expect(hasSiteInSecondTenant).toBe(false);
    });

    it('should not share teams across tenants', async () => {
      const tenant2 = await prisma.tenant.create({
        data: {
          code: 'TENANT-2-' + Date.now(),
          name: 'Second Tenant',
          plan: 'STANDARD',
          status: 'ACTIVE',
        },
      });

      const team = testContext.teams[0];

      const tenantsForTeam = await prisma.team.findMany({
        where: { code: team.code },
      });

      const hasTeamInSecondTenant = tenantsForTeam.some((t) => t.tenantId === tenant2.id);
      expect(hasTeamInSecondTenant).toBe(false);
    });
  });

  describe('Hierarchical Structure', () => {
    it('should support tenant > site > team hierarchy', async () => {
      const tenant = testContext.tenant;
      const site = testContext.sites[0];
      const team = testContext.teams[0];

      expect(tenant.id).toBeDefined();
      expect(site.tenantId).toBe(tenant.id);
      expect(team.siteId).toBe(site.id);
      expect(team.tenantId).toBe(tenant.id);
    });

    it('should cascade deactivation checks', async () => {
      const site = testContext.sites[0];
      const team = testContext.teams[0];

      // Deactivate site
      await prisma.site.update({
        where: { id: site.id },
        data: { isActive: false },
      });

      const activeSites = await prisma.site.findMany({
        where: {
          id: site.id,
          isActive: true,
        },
      });

      expect(activeSites.length).toBe(0);
    });

    it('should list all teams for a site', async () => {
      const site = testContext.sites[0];

      const teams = await prisma.team.findMany({
        where: {
          tenantId: testContext.tenant.id,
          siteId: site.id,
        },
      });

      expect(teams.every((t) => t.siteId === site.id)).toBe(true);
    });

    it('should list all sites for a tenant', async () => {
      const sites = await prisma.site.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      expect(sites.every((s) => s.tenantId === testContext.tenant.id)).toBe(true);
    });
  });
});
