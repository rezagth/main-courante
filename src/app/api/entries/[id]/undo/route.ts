import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prisma, withTenantContext } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requirePermission('ENTRY:CREATE');
  const { id } = await params;

  const entry = await withTenantContext(user.tenantId, async () =>
    prisma.entreeMainCourante.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    }),
  );
  if (!entry) {
    return NextResponse.json({ error: 'Entree introuvable' }, { status: 404 });
  }

  const isUndoWindowOpen = Date.now() - entry.createdAt.getTime() <= 30_000;
  if (!isUndoWindowOpen) {
    return NextResponse.json({ error: 'Fenetre undo depassee' }, { status: 409 });
  }

  await withTenantContext(user.tenantId, async () =>
    prisma.entreeMainCourante.update({
      where: { id, tenantId: user.tenantId },
      data: { deletedAt: new Date() },
    }),
  );

  await logAuditEvent({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'ENTRY_UNDO_SOFT_DELETE',
    resource: 'entry',
    metadata: { entryId: id },
  });

  return NextResponse.json({ ok: true });
}
