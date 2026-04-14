import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hash as hashArgon2 } from 'argon2';

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

const tenantCode = process.env.AGENT_TENANT_CODE ?? 'DEMO';
const email = process.env.AGENT_EMAIL ?? 'agent2@demo.local';
const password = process.env.AGENT_PASSWORD ?? 'Agent1234!';
const firstName = process.env.AGENT_FIRST_NAME ?? 'Samir';
const lastName = process.env.AGENT_LAST_NAME ?? 'Agent';

async function run() {
  const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
  if (!tenant) {
    throw new Error(`Tenant not found for code: ${tenantCode}`);
  }

  const role = await prisma.role.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: 'AGENT' } },
  });
  if (!role) {
    throw new Error('Role AGENT not found. Run bootstrap first.');
  }

  const site = await prisma.site.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!site) {
    throw new Error('No site found for tenant. Create a site first.');
  }

  const team = await prisma.team.findFirst({
    where: { tenantId: tenant.id, siteId: site.id, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!team) {
    throw new Error('No active team found for tenant/site. Create a team first.');
  }

  const passwordHash = await hashArgon2(password);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    create: {
      tenantId: tenant.id,
      siteId: site.id,
      email,
      firstName,
      lastName,
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
    update: {
      siteId: site.id,
      firstName,
      lastName,
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  await prisma.userRoleAssignment.deleteMany({
    where: { tenantId: tenant.id, userId: user.id },
  });

  await prisma.userRoleAssignment.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      roleId: role.id,
      validFrom: new Date(),
    },
  });

  const existingTeamMember = await prisma.teamMember.findFirst({
    where: { tenantId: tenant.id, teamId: team.id, userId: user.id, endedAt: null },
  });
  if (!existingTeamMember) {
    await prisma.teamMember.create({
      data: {
        tenantId: tenant.id,
        teamId: team.id,
        userId: user.id,
        startedAt: new Date(),
      },
    });
  }

  console.log('Agent account ready.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('Route: /agent/dashboard');
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
