import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prisma, withTenantContext } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { assertTenantQuota, QuotaExceededError } from '@/lib/quotas';

type EntryInput = {
  typeEvenementId: string;
  description: string;
  localisation?: string;
  gravite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  photoUrl?: string;
  timestamp?: string;
};

export async function GET(request: Request) {
  const user = await requirePermission('ENTRY:READ');
  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get('take') ?? '20'), 50);
  const page = Math.max(Number(searchParams.get('page') ?? '0'), 0);

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const data = await withTenantContext(user.tenantId, async () =>
    prisma.entreeMainCourante.findMany({
      where: {
        deletedAt: null,
        timestamp: { gte: startOfDay },
      },
      include: {
        typeEvenement: { select: { label: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip: page * take,
      take,
    }),
  );

  return NextResponse.json({ data, nextPage: data.length === take ? page + 1 : null });
}

export async function POST(request: Request) {
  const user = await requirePermission('ENTRY:CREATE');
  try {
    await assertTenantQuota(user.tenantId, 'entries_month');
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: error.message, code: 'QUOTA_EXCEEDED' },
        { status: 402 },
      );
    }
    throw error;
  }
  const payload = (await request.json()) as EntryInput;
  if (!payload.typeEvenementId || !payload.description?.trim()) {
    return NextResponse.json({ error: 'Type et description requis' }, { status: 400 });
  }

  const activeMembership = await withTenantContext(user.tenantId, async () =>
    prisma.teamMember.findFirst({
      where: { userId: user.id, endedAt: null },
      include: { team: true },
      orderBy: { startedAt: 'desc' },
    }),
  );
  if (!activeMembership) {
    return NextResponse.json({ error: "L'utilisateur n'a pas d'equipe active" }, { status: 400 });
  }

  const created = await withTenantContext(user.tenantId, async () =>
    prisma.entreeMainCourante.create({
      data: {
        tenantId: user.tenantId,
        siteId: activeMembership.team.siteId,
        teamId: activeMembership.teamId,
        userId: user.id,
        typeEvenementId: payload.typeEvenementId,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        description: payload.description.trim(),
        localisation: payload.localisation?.trim() || null,
        gravite: payload.gravite ?? null,
        photoUrl: payload.photoUrl ?? null,
      },
    }),
  );

  await logAuditEvent({
    tenantId: user.tenantId,
    userId: user.id,
    impersonatedBy: user.impersonatedBy ?? null,
    action: 'ENTRY_CREATED',
    resource: 'entry',
    metadata: { entryId: created.id },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
