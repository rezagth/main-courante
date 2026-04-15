import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestContext, cleanupDatabase, getPrisma, createTestEntry } from '../utils/test-helpers';

describe('Entries Management API', () => {
  let testContext: any;
  const prisma = getPrisma();

  beforeEach(async () => {
    testContext = await setupTestContext();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Entry Creation', () => {
    it('should create entry with all required fields', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id,
        'Test Entry Description'
      );

      expect(entry.tenantId).toBe(testContext.tenant.id);
      expect(entry.description).toBe('Test Entry Description');
      expect(entry.gravite).toBe('MOYENNE');
    });

    it('should record entry timestamp', async () => {
      const before = new Date();
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );
      const after = new Date();

      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should associate entry with event type', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[1].id
      );

      const eventType = await prisma.typeEvenement.findFirst({
        where: { id: testContext.eventTypes[1].id },
      });

      expect(entry.typeEvenementId).toBe(eventType?.id);
    });

    it('should associate entry with site', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      expect(entry.siteId).toBe(testContext.sites[0].id);
    });

    it('should associate entry with team', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      expect(entry.teamId).toBe(testContext.teams[0].id);
    });

    it('should associate entry with user creator', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      expect(entry.userId).toBe(testContext.users.chef.id);
    });

    it('should store entry location', async () => {
      const entry = await prisma.entreeMainCourante.create({
        data: {
          tenantId: testContext.tenant.id,
          siteId: testContext.sites[0].id,
          teamId: testContext.teams[0].id,
          userId: testContext.users.agent.id,
          typeEvenementId: testContext.eventTypes[0].id,
          timestamp: new Date(),
          description: 'Entry with location',
          localisation: 'Building A - Room 201',
          gravite: 'MOYENNE',
        },
      });

      expect(entry.localisation).toBe('Building A - Room 201');
    });

    it('should support different severity levels', async () => {
      const severities = ['INFO', 'FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'] as const;

      for (const gravite of severities) {
        const entry = await prisma.entreeMainCourante.create({
          data: {
            tenantId: testContext.tenant.id,
            siteId: testContext.sites[0].id,
            teamId: testContext.teams[0].id,
            userId: testContext.users.agent.id,
            typeEvenementId: testContext.eventTypes[0].id,
            timestamp: new Date(),
            description: `Entry with ${gravite}`,
            localisation: 'Test Location',
            gravite,
          },
        });

        expect(entry.gravite).toBe(gravite);
      }
    });
  });

  describe('Entry Retrieval', () => {
    it('should retrieve entry by ID', async () => {
      const created = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id,
        'Find me'
      );

      const found = await prisma.entreeMainCourante.findFirst({
        where: { id: created.id },
      });

      expect(found?.id).toBe(created.id);
      expect(found?.description).toBe('Find me');
    });

    it('should list entries with filters', async () => {
      await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[1].id
      );

      const entries = await prisma.entreeMainCourante.findMany({
        where: { tenantId: testContext.tenant.id },
      });

      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter entries by site', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      const filtered = await prisma.entreeMainCourante.findMany({
        where: {
          tenantId: testContext.tenant.id,
          siteId: testContext.sites[0].id,
        },
      });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((e) => e.id === entry.id)).toBe(true);
    });

    it('should filter entries by team', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      const filtered = await prisma.entreeMainCourante.findMany({
        where: {
          tenantId: testContext.tenant.id,
          teamId: testContext.teams[0].id,
        },
      });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((e) => e.id === entry.id)).toBe(true);
    });

    it('should filter entries by user', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      const filtered = await prisma.entreeMainCourante.findMany({
        where: {
          tenantId: testContext.tenant.id,
          userId: testContext.users.agent.id,
        },
      });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((e) => e.id === entry.id)).toBe(true);
    });

    it('should filter entries by event type', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      const filtered = await prisma.entreeMainCourante.findMany({
        where: {
          tenantId: testContext.tenant.id,
          typeEvenementId: testContext.eventTypes[0].id,
        },
      });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((e) => e.id === entry.id)).toBe(true);
    });

    it('should filter entries by severity', async () => {
      const entry = await prisma.entreeMainCourante.create({
        data: {
          tenantId: testContext.tenant.id,
          siteId: testContext.sites[0].id,
          teamId: testContext.teams[0].id,
          userId: testContext.users.agent.id,
          typeEvenementId: testContext.eventTypes[0].id,
          timestamp: new Date(),
          description: 'Critical entry',
          localisation: 'Critical Location',
          gravite: 'CRITIQUE',
        },
      });

      const filtered = await prisma.entreeMainCourante.findMany({
        where: {
          tenantId: testContext.tenant.id,
          gravite: 'CRITIQUE',
        },
      });

      expect(filtered.some((e) => e.id === entry.id)).toBe(true);
    });

    it('should include related data in queries', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      const entryWithRelations = await prisma.entreeMainCourante.findFirst({
        where: { id: entry.id },
        include: {
          site: true,
          team: true,
          user: true,
          typeEvenement: true,
        },
      });

      expect(entryWithRelations?.site).toBeDefined();
      expect(entryWithRelations?.team).toBeDefined();
      expect(entryWithRelations?.user).toBeDefined();
      expect(entryWithRelations?.typeEvenement).toBeDefined();
    });
  });

  describe('Entry Updates', () => {
    it('should update entry description', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id,
        'Original description'
      );

      const updated = await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { description: 'Updated description' },
      });

      expect(updated.description).toBe('Updated description');
    });

    it('should update entry severity', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      const updated = await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { gravite: 'ELEVEE' },
      });

      expect(updated.gravite).toBe('ELEVEE');
    });

    it('should update entry location', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      const updated = await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { localisation: 'New Location' },
      });

      expect(updated.localisation).toBe('New Location');
    });

    it('should not update entry timestamp', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      const originalTimestamp = entry.timestamp;

      const updated = await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { description: 'Updated' },
      });

      expect(updated.timestamp).toEqual(originalTimestamp);
    });
  });

  describe('Entry Soft Delete', () => {
    it('should soft delete entry using deletedAt flag', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id
      );

      const deleted = await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { deletedAt: new Date() },
      });

      expect(deleted.deletedAt).toBeDefined();
      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it('should exclude soft deleted entries from queries', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { deletedAt: new Date() },
      });

      const active = await prisma.entreeMainCourante.findMany({
        where: {
          tenantId: testContext.tenant.id,
          deletedAt: null,
        },
      });

      expect(active.some((e) => e.id === entry.id)).toBe(false);
    });

    it('should preserve deleted entry data', async () => {
      const entry = await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.agent.id,
        testContext.eventTypes[0].id,
        'Important data'
      );

      const originalDescription = entry.description;

      await prisma.entreeMainCourante.update({
        where: { id: entry.id },
        data: { deletedAt: new Date() },
      });

      const found = await prisma.entreeMainCourante.findFirst({
        where: { id: entry.id },
      });

      expect(found?.description).toBe(originalDescription);
    });
  });

  describe('Event Types Management', () => {
    it('should list all active event types', async () => {
      const types = await prisma.typeEvenement.findMany({
        where: {
          tenantId: testContext.tenant.id,
          isActive: true,
        },
      });

      expect(types.length).toBeGreaterThan(0);
    });

    it('should filter by event type code', async () => {
      const type = await prisma.typeEvenement.findFirst({
        where: {
          tenantId: testContext.tenant.id,
          code: 'RONDE',
        },
      });

      expect(type?.code).toBe('RONDE');
    });

    it('should create custom event type', async () => {
      const newType = await prisma.typeEvenement.create({
        data: {
          tenantId: testContext.tenant.id,
          code: 'CUSTOM_EVENT',
          label: 'Custom Event Type',
        },
      });

      expect(newType.code).toBe('CUSTOM_EVENT');
      expect(newType.label).toBe('Custom Event Type');
    });

    it('should deactivate event type', async () => {
      const type = testContext.eventTypes[0];

      const deactivated = await prisma.typeEvenement.update({
        where: { id: type.id },
        data: { isActive: false },
      });

      expect(deactivated.isActive).toBe(false);
    });
  });

  describe('Entry Statistics and Aggregations', () => {
    it('should count entries by type', async () => {
      const type = testContext.eventTypes[0];

      // Create multiple entries
      for (let i = 0; i < 3; i++) {
        await createTestEntry(
          testContext.tenant.id,
          testContext.sites[0].id,
          testContext.teams[0].id,
          testContext.users.agent.id,
          type.id
        );
      }

      const count = await prisma.entreeMainCourante.count({
        where: {
          tenantId: testContext.tenant.id,
          typeEvenementId: type.id,
        },
      });

      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should count entries by severity', async () => {
      // Create entries with different severities
      for (const gravite of ['FAIBLE', 'MOYENNE', 'ELEVEE'] as const) {
        await prisma.entreeMainCourante.create({
          data: {
            tenantId: testContext.tenant.id,
            siteId: testContext.sites[0].id,
            teamId: testContext.teams[0].id,
            userId: testContext.users.agent.id,
            typeEvenementId: testContext.eventTypes[0].id,
            timestamp: new Date(),
            description: `${gravite} severity`,
            localisation: 'Test',
            gravite,
          },
        });
      }

      const criticalCount = await prisma.entreeMainCourante.count({
        where: {
          tenantId: testContext.tenant.id,
          gravite: 'ELEVEE',
        },
      });

      expect(criticalCount).toBeGreaterThan(0);
    });

    it('should get entries by date range', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await createTestEntry(
        testContext.tenant.id,
        testContext.sites[0].id,
        testContext.teams[0].id,
        testContext.users.chef.id,
        testContext.eventTypes[0].id
      );

      const recentEntries = await prisma.entreeMainCourante.findMany({
        where: {
          tenantId: testContext.tenant.id,
          timestamp: {
            gte: oneDayAgo,
            lte: now,
          },
        },
      });

      expect(recentEntries.length).toBeGreaterThan(0);
    });
  });
});
