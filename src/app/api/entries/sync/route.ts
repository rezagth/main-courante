import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { requirePermission } from '@/lib/authorization';
import { prisma, withTenantContext } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

type SyncEntry = {
  id: string;
  typeEvenementId: string;
  timestamp: string;
  description: string;
  descriptionHash: string;
  localisation?: string;
  gravite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  photoUrl?: string;
  clientUpdatedAt: string;
};

export async function POST(request: Request) {
  const user = await requirePermission('ENTRY:CREATE');
  const payload = (await request.json()) as { entries?: SyncEntry[] };
  const entries = payload.entries ?? [];

  const syncedIds: string[] = [];
  const conflicts: Array<{ entryId: string; reason: string; serverEntryId?: string }> = [];

  await withTenantContext(user.tenantId, async () => {
    const activeMembership = await prisma.teamMember.findFirst({
      where: { userId: user.id, endedAt: null },
      include: { team: true },
      orderBy: { startedAt: 'desc' },
    });
    if (!activeMembership) {
      return;
    }

    for (const item of entries) {
      const serverHash = createHash('sha256')
        .update(`${item.timestamp}:${item.description}`)
        .digest('hex');
      const hashMatched = serverHash === item.descriptionHash;

      const existing = await prisma.entreeMainCourante.findFirst({
        where: {
          userId: user.id,
          timestamp: new Date(item.timestamp),
          description: item.description,
        },
      });

      if (!existing) {
        await prisma.entreeMainCourante.create({
          data: {
            tenantId: user.tenantId,
            siteId: activeMembership.team.siteId,
            teamId: activeMembership.teamId,
            userId: user.id,
            typeEvenementId: item.typeEvenementId,
            timestamp: new Date(item.timestamp),
            description: item.description,
            localisation: item.localisation ?? null,
            gravite: item.gravite ?? null,
            photoUrl: item.photoUrl ?? null,
          },
        });
        syncedIds.push(item.id);
        continue;
      }

      if (!hashMatched) {
        conflicts.push({
          entryId: item.id,
          reason: 'hash-mismatch',
          serverEntryId: existing.id,
        });
      }

      const clientUpdatedAt = new Date(item.clientUpdatedAt);
      if (clientUpdatedAt > existing.updatedAt) {
        await prisma.entreeMainCourante.update({
          where: { id: existing.id, tenantId: user.tenantId },
          data: {
            localisation: item.localisation ?? existing.localisation,
            gravite: item.gravite ?? existing.gravite,
            photoUrl: item.photoUrl ?? existing.photoUrl,
          },
        });
        conflicts.push({
          entryId: item.id,
          reason: 'last-write-wins-applied',
          serverEntryId: existing.id,
        });
      } else {
        conflicts.push({
          entryId: item.id,
          reason: 'duplicate-ignored',
          serverEntryId: existing.id,
        });
      }

      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'SYNC_CONFLICT',
        resource: 'entry',
        metadata: { entryId: item.id, serverEntryId: existing.id },
      });

      syncedIds.push(item.id);
    }
  });

  return NextResponse.json({ syncedIds, conflicts });
}
