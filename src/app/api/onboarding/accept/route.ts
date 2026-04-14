import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { hash as hashArgon2 } from 'argon2';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';

const schema = z.object({
  token: z.string().min(20),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(8),
});

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { token, firstName, lastName, password } = parsed.data;
  const invitation = await prismaAdmin.tenantInvitation.findFirst({
    where: {
      tokenHash: hashToken(token),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation invalide ou expiree' }, { status: 400 });
  }

  const passwordHash = await hashArgon2(password);
  await prismaAdmin.user.upsert({
    where: {
      tenantId_email: {
        tenantId: invitation.tenantId,
        email: invitation.email,
      },
    },
    create: {
      tenantId: invitation.tenantId,
      email: invitation.email,
      firstName,
      lastName,
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
    update: {
      firstName,
      lastName,
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  await prismaAdmin.tenantInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  await prismaAdmin.tenantOnboardingChecklist.updateMany({
    where: { tenantId: invitation.tenantId },
    data: { agentInvited: true },
  });

  return NextResponse.json({ ok: true });
}
