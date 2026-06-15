import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/prisma';
import {
  authenticateCredentials,
  createAccessToken,
  SESSION_TTL_SECONDS,
} from '@/lib/auth';
import { assertLoginRateLimit, extractIp } from '@/lib/security';

const MOBILE_ROLES = new Set(['AGENT', 'SUPER_ADMIN']);

export async function POST(request: Request) {
  const ip = extractIp(request.headers.get('x-forwarded-for'));

  try {
    await assertLoginRateLimit(ip);
  } catch {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const user = await authenticateCredentials(body.email, body.password, ip);
  if (!user) {
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
  }

  const hasMobileRole = user.roles.some((role) => MOBILE_ROLES.has(role));
  if (!hasMobileRole) {
    return NextResponse.json(
      { error: 'Accès réservé aux agents' },
      { status: 403 },
    );
  }

  const activeMembership = await prismaAdmin.teamMember.findFirst({
    where: { tenantId: user.tenantId, userId: user.id, endedAt: null },
    select: { id: true },
  });

  if (!activeMembership) {
    return NextResponse.json(
      { error: "Aucune équipe active associée à ce compte" },
      { status: 403 },
    );
  }

  const { accessToken } = await createAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    siteId: user.siteId,
    roles: user.roles,
  });

  return NextResponse.json({
    accessToken,
    expiresIn: SESSION_TTL_SECONDS,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      siteId: user.siteId,
      roles: user.roles,
    },
  });
}
