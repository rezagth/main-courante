import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaAdmin } from '@/lib/prisma';
import {
  assertChefCanManageAgent,
  getManagedSiteIdsForUser,
  requireAnyRole,
  requirePermission,
} from '@/lib/authorization';

const patchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  isActive: z.boolean().optional(),
  locationAssignments: z
    .array(
      z.object({
        siteId: z.string().uuid(),
        locationId: z.string().uuid().optional().nullable(),
      }),
    )
    .optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('USER:READ');
  await requireAnyRole(['CHEF_EQUIPE']);
  const { id } = await context.params;

  try {
    await assertChefCanManageAgent(actor.tenantId, actor.id, id);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const now = new Date();
  const managedSiteIds = await getManagedSiteIdsForUser(actor.tenantId, actor.id);

  if (payload.locationAssignments) {
    for (const assignment of payload.locationAssignments) {
      if (!managedSiteIds.includes(assignment.siteId)) {
        return NextResponse.json({ error: 'One or more siteId are outside your scope' }, { status: 403 });
      }
    }

    const locationIds = payload.locationAssignments
      .map((item) => item.locationId)
      .filter((value): value is string => Boolean(value));

    if (locationIds.length > 0) {
      const locations = await prismaAdmin.location.findMany({
        where: { tenantId: actor.tenantId, id: { in: locationIds }, siteId: { in: managedSiteIds } },
        select: { id: true, siteId: true },
      });
      const locationById = new Map(locations.map((location) => [location.id, location]));
      for (const assignment of payload.locationAssignments) {
        if (!assignment.locationId) continue;
        const location = locationById.get(assignment.locationId);
        if (!location) {
          return NextResponse.json({ error: 'Invalid locationId in locationAssignments' }, { status: 400 });
        }
        if (location.siteId !== assignment.siteId) {
          return NextResponse.json({ error: 'locationId does not belong to siteId' }, { status: 400 });
        }
      }
    }
  }

  const updated = await prismaAdmin.$transaction(async (tx) => {
    const userUpdateData: Record<string, unknown> = {};
    if (payload.firstName !== undefined) userUpdateData.firstName = payload.firstName;
    if (payload.lastName !== undefined) userUpdateData.lastName = payload.lastName;
    if (payload.status !== undefined) userUpdateData.status = payload.status;
    if (payload.isActive !== undefined) userUpdateData.isActive = payload.isActive;

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id_tenantId: { id, tenantId: actor.tenantId } },
        data: userUpdateData,
      });
    }

    if (payload.locationAssignments !== undefined) {
      await tx.userLocationAssignment.updateMany({
        where: {
          tenantId: actor.tenantId,
          userId: id,
          siteId: { in: managedSiteIds },
          endedAt: null,
        },
        data: { endedAt: now },
      });

      if (payload.locationAssignments.length > 0) {
        await tx.userLocationAssignment.createMany({
          data: payload.locationAssignments.map((assignment) => ({
            tenantId: actor.tenantId,
            userId: id,
            siteId: assignment.siteId,
            locationId: assignment.locationId ?? null,
            startedAt: now,
          })),
        });
      }

      const activeAssignment = payload.locationAssignments.find((item) => item.siteId === managedSiteIds[0]);
      if (activeAssignment) {
        await tx.user.update({
          where: { id_tenantId: { id, tenantId: actor.tenantId } },
          data: { siteId: activeAssignment.siteId },
        });
      }
    }

    return tx.user.findUniqueOrThrow({
      where: { id_tenantId: { id, tenantId: actor.tenantId } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isActive: true,
      },
    });
  });

  return NextResponse.json({ user: updated });
}
