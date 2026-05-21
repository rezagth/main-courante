import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/prisma';
import {
  getManagedSiteIdsForUser,
  requireAnyRole,
  requirePermission,
} from '@/lib/authorization';

export async function GET(request: Request) {
  const actor = await requirePermission('USER:READ');
  await requireAnyRole(['CHEF_EQUIPE']);

  const { searchParams } = new URL(request.url);
  const siteIdFilter = searchParams.get('siteId');
  const locationIdFilter = searchParams.get('locationId');
  const now = new Date();

  const managedSiteIds = await getManagedSiteIdsForUser(actor.tenantId, actor.id);
  if (managedSiteIds.length === 0) {
    return NextResponse.json({ agents: [], managedSiteIds: [] });
  }

  if (siteIdFilter && !managedSiteIds.includes(siteIdFilter)) {
    return NextResponse.json({ error: 'Forbidden: site is outside your managed scope' }, { status: 403 });
  }

  const assignments = await prismaAdmin.userLocationAssignment.findMany({
    where: {
      tenantId: actor.tenantId,
      siteId: siteIdFilter ?? { in: managedSiteIds },
      ...(locationIdFilter ? { locationId: locationIdFilter } : {}),
      startedAt: { lte: now },
      OR: [{ endedAt: null }, { endedAt: { gte: now } }],
    },
    select: {
      userId: true,
      siteId: true,
      locationId: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          isActive: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [{ siteId: 'asc' }, { userId: 'asc' }, { startedAt: 'desc' }],
  });

  const grouped = new Map<
    string,
    {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      status: string;
      isActive: boolean;
      assignments: Array<{
        siteId: string;
        siteName: string;
        locationId: string | null;
        locationName: string | null;
      }>;
    }
  >();

  for (const assignment of assignments) {
    const current = grouped.get(assignment.userId);
    const normalized = {
      siteId: assignment.siteId,
      siteName: assignment.site.name,
      locationId: assignment.locationId,
      locationName: assignment.location?.name ?? null,
    };

    if (!current) {
      grouped.set(assignment.userId, {
        id: assignment.user.id,
        email: assignment.user.email,
        firstName: assignment.user.firstName,
        lastName: assignment.user.lastName,
        status: assignment.user.status,
        isActive: assignment.user.isActive,
        assignments: [normalized],
      });
      continue;
    }

    const already = current.assignments.some(
      (item) => item.siteId === normalized.siteId && item.locationId === normalized.locationId,
    );
    if (!already) {
      current.assignments.push(normalized);
    }
  }

  return NextResponse.json({
    managedSiteIds,
    agents: Array.from(grouped.values()),
  });
}
