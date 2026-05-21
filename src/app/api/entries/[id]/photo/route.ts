import { NextResponse } from 'next/server';
import { getManagedSiteIdsForUser, requirePermission, resolveEntryReadScope } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requirePermission('ENTRY:READ');
  const { id } = await context.params;

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
      return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });
    }
    where.siteId = { in: scope.siteIds };
  }

  const entry = await prismaAdmin.entreeMainCourante.findFirst({
    where,
    select: {
      photoData: true,
      photoMimeType: true,
      photoSizeBytes: true,
      updatedAt: true,
    },
  });

  if (!entry?.photoData) {
    return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });
  }

  return new NextResponse(entry.photoData, {
    status: 200,
    headers: {
      'Content-Type': entry.photoMimeType ?? 'application/octet-stream',
      'Content-Length': String(entry.photoSizeBytes ?? entry.photoData.length),
      'Cache-Control': 'private, max-age=3600',
      ETag: `"${entry.updatedAt.getTime()}-${entry.photoSizeBytes ?? entry.photoData.length}"`,
    },
  });
}
