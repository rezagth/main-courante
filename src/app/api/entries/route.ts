import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getManagedSiteIdsForUser, requirePermission, resolveEntryReadScope } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';
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

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

function normalizeOptionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: Request) {
  const user = await requirePermission('ENTRY:READ', { request });
  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get('take') ?? '20'), 50);
  const page = Math.max(Number(searchParams.get('page') ?? '0'), 0);
  const siteId = searchParams.get('siteId') || undefined;
  const teamId = searchParams.get('teamId') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const managedSiteIds = user.roles.includes('CHEF_EQUIPE')
    ? await getManagedSiteIdsForUser(user.tenantId, user.id)
    : [];
  const scope = resolveEntryReadScope(user.roles ?? [], user.id, managedSiteIds);

  const forbidden = (message: string) => NextResponse.json({ error: message }, { status: 403 });
  const where: Record<string, unknown> = {
    tenantId: user.tenantId,
    deletedAt: null,
  };

  if (scope.kind === 'own') {
    if ((siteId && siteId !== user.siteId) || teamId || (userId && userId !== user.id)) {
      return forbidden('Forbidden: agent scope is limited to your own entries');
    }
    where.userId = user.id;
  } else if (scope.kind === 'managed-sites') {
    if (scope.siteIds.length === 0) {
      return NextResponse.json({ data: [], nextPage: null });
    }

    if (siteId && !scope.siteIds.includes(siteId)) {
      return forbidden('Forbidden: site is outside your managed scope');
    }

    if (teamId) {
      const team = await prismaAdmin.team.findFirst({
        where: { id: teamId, tenantId: user.tenantId },
        select: { siteId: true },
      });
      if (!team || !scope.siteIds.includes(team.siteId)) {
        return forbidden('Forbidden: team is outside your managed scope');
      }
      where.teamId = teamId;
    }

    if (userId) {
      const targetAssignment = await prismaAdmin.userLocationAssignment.findFirst({
        where: {
          tenantId: user.tenantId,
          userId,
          siteId: { in: scope.siteIds },
          startedAt: { lte: new Date() },
          OR: [{ endedAt: null }, { endedAt: { gte: new Date() } }],
        },
        select: { id: true },
      });
      if (!targetAssignment) {
        return forbidden('Forbidden: user is outside your managed scope');
      }
      where.userId = userId;
    }

    where.siteId = siteId ? siteId : { in: scope.siteIds };
  } else {
    if (siteId) where.siteId = siteId;
    if (teamId) where.teamId = teamId;
    if (userId) where.userId = userId;
  }

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const data = await prismaAdmin.entreeMainCourante.findMany({
    where: {
      ...where,
      timestamp: { gte: startOfDay },
    },
    include: {
      typeEvenement: { select: { label: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { timestamp: 'desc' },
    skip: page * take,
    take,
  });

  return NextResponse.json({ data, nextPage: data.length === take ? page + 1 : null });
}

export async function POST(request: Request) {
  const user = await requirePermission('ENTRY:CREATE', { request });
  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  let payload: EntryInput;
  let photoData: Uint8Array<ArrayBuffer> | null = null;
  let photoMimeType: string | null = null;
  let photoSizeBytes: number | null = null;

  if (isMultipart) {
    const formData = await request.formData();
    const description = normalizeOptionalText(formData.get('description'));
    const typeEvenementId = normalizeOptionalText(formData.get('typeEvenementId'));
    const localisation = normalizeOptionalText(formData.get('localisation'));
    const graviteValue = normalizeOptionalText(formData.get('gravite'));
    const timestamp = normalizeOptionalText(formData.get('timestamp'));
    const photoFile = formData.get('photo');

    payload = {
      typeEvenementId: typeEvenementId ?? '',
      description: description ?? '',
      localisation,
      gravite: graviteValue as EntryInput['gravite'] | undefined,
      timestamp,
    };

    if (photoFile instanceof File && photoFile.size > 0) {
      if (!ALLOWED_FILE_TYPES.includes(photoFile.type)) {
        return NextResponse.json({ error: 'Type de fichier invalide' }, { status: 400 });
      }
      if (photoFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Photo trop volumineuse (max 4MB).' }, { status: 400 });
      }
      const photoArrayBuffer: ArrayBuffer = await photoFile.arrayBuffer();
      photoData = new Uint8Array(photoArrayBuffer);
      photoMimeType = photoFile.type;
      photoSizeBytes = photoFile.size;
    }
  } else {
    payload = (await request.json()) as EntryInput;
  }

  try {
    await assertTenantQuota(user.tenantId, 'entries_month');
    if (photoSizeBytes) {
      await assertTenantQuota(user.tenantId, 'storage_gb', { additionalBytes: photoSizeBytes });
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: error.message, code: 'QUOTA_EXCEEDED' },
        { status: 402 },
      );
    }
    throw error;
  }

  if (!payload.typeEvenementId || !payload.description?.trim()) {
    return NextResponse.json({ error: 'Type et description requis' }, { status: 400 });
  }

  const activeMembership = await prismaAdmin.teamMember.findFirst({
    where: { tenantId: user.tenantId, userId: user.id, endedAt: null },
    include: { team: true },
    orderBy: { startedAt: 'desc' },
  });
  if (!activeMembership) {
    return NextResponse.json({ error: "L'utilisateur n'a pas d'equipe active" }, { status: 400 });
  }

  const entryId = randomUUID();
  const internalPhotoUrl = photoData ? `/api/entries/${entryId}/photo` : null;

  const created = await prismaAdmin.entreeMainCourante.create({
    data: {
      id: entryId,
      tenantId: user.tenantId,
      siteId: activeMembership.team.siteId,
      teamId: activeMembership.teamId,
      userId: user.id,
      typeEvenementId: payload.typeEvenementId,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      description: payload.description.trim(),
      localisation: payload.localisation?.trim() || null,
      gravite: payload.gravite ?? null,
      photoUrl: internalPhotoUrl ?? payload.photoUrl ?? null,
      photoData,
      photoMimeType,
      photoSizeBytes,
    },
  });

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
