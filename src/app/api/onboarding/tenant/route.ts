import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hash as hashArgon2 } from 'argon2';
import { prismaAdmin } from '@/lib/prisma';
import { createInvitationLink } from '@/lib/magic-link';
import { sendMail } from '@/lib/mail';
import { logger } from '@/lib/logger';

const schema = z.object({
  name: z.string().min(2),
  domain: z.string().min(3),
  adminEmail: z.email(),
  tempPassword: z.string().min(8),
  inviteEmails: z.array(z.email()).optional().default([]),
});

const DEFAULT_EVENT_TYPES = [
  { code: 'RONDE', label: 'Ronde' },
  { code: 'ALARME', label: 'Alarme' },
  { code: 'ANOMALIE', label: 'Anomalie' },
  { code: 'OBSERVATION', label: 'Observation' },
  { code: 'INTERVENTION', label: 'Intervention' },
];

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, domain, adminEmail, tempPassword, inviteEmails } = parsed.data;
  const code = domain.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 32);
  const passwordHash = await hashArgon2(tempPassword);

  const result = await prismaAdmin.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name, code, plan: 'STANDARD', status: 'ACTIVE' },
    });
    const admin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        firstName: 'Admin',
        lastName: name,
        passwordHash,
      },
    });
    await tx.tenantQuota.create({
      data: {
        tenantId: tenant.id,
        maxActiveUsers: 25,
        maxEntriesPerMonth: 10000,
        maxStorageGb: 20,
      },
    });
    await tx.tenantRetentionPolicy.create({
      data: { tenantId: tenant.id, activeYears: 1, archiveYears: 5 },
    });
    await tx.tenantOnboardingChecklist.create({
      data: { tenantId: tenant.id },
    });
    await tx.typeEvenement.createMany({
      data: DEFAULT_EVENT_TYPES.map((item) => ({
        tenantId: tenant.id,
        code: item.code,
        label: item.label,
      })),
    });
    return { tenant, admin };
  });

  for (const email of inviteEmails) {
    const url = await createInvitationLink(result.tenant.id, email, result.admin.id);
    await sendMail(
      email,
      'Invitation main courante',
      `<p>Vous etes invite. Lien valide 24h :</p><p><a href="${url}">${url}</a></p>`,
    );
  }

  logger.info('tenant_onboarding_created', { tenantId: result.tenant.id, domain });

  return NextResponse.json({
    tenantId: result.tenant.id,
    checklist: {
      siteCreated: false,
      teamCreated: false,
      agentInvited: inviteEmails.length > 0,
    },
  });
}
