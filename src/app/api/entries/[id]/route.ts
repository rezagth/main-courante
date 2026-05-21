import { NextResponse } from 'next/server';
import { getManagedSiteIdsForUser, requirePermission, resolveEntryReadScope } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requirePermission('ENTRY:READ');
  const { id } = await params;
  const managedSiteIds = user.roles.includes('CHEF_EQUIPE')
    ? await getManagedSiteIdsForUser(user.tenantId, user.id)
    : [];
  const scope = resolveEntryReadScope(user.roles ?? [], user.id, managedSiteIds);

  const where: Record<string, unknown> = {
    id,
    tenantId: user.tenantId,
    deletedAt: null,
  };

  if (scope.kind === 'own') {
    where.userId = user.id;
  } else if (scope.kind === 'managed-sites') {
    if (scope.siteIds.length === 0) {
      return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    }
    where.siteId = { in: scope.siteIds };
  }

  const entry = await prismaAdmin.entreeMainCourante.findFirst({
    where,
    select: {
      id: true,
      timestamp: true,
      description: true,
      localisation: true,
      gravite: true,
      photoUrl: true,
      photoMimeType: true,
      photoSizeBytes: true,
      site: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
      typeEvenement: { select: { id: true, label: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!entry) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
  }

  return NextResponse.json({ data: entry });
}
