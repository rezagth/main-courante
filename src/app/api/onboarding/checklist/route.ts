import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/authorization';
import { prisma, withTenantContext } from '@/lib/prisma';

const schema = z.object({
  siteCreated: z.boolean().optional(),
  teamCreated: z.boolean().optional(),
  agentInvited: z.boolean().optional(),
});

export async function GET() {
  const user = await requireAnyRole(['SUPER_ADMIN', 'CHEF_EQUIPE', 'CLIENT']);
  const checklist = await withTenantContext(user.tenantId, () =>
    prisma.tenantOnboardingChecklist.findUnique({ where: { tenantId: user.tenantId } }),
  );
  return NextResponse.json({ data: checklist });
}

export async function PATCH(request: Request) {
  const user = await requireAnyRole(['SUPER_ADMIN', 'CHEF_EQUIPE']);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const checklist = await withTenantContext(user.tenantId, async () => {
    const updated = await prisma.tenantOnboardingChecklist.update({
      where: { tenantId: user.tenantId },
      data,
    });
    const done = updated.siteCreated && updated.teamCreated && updated.agentInvited;
    if (done && !updated.completedAt) {
      return prisma.tenantOnboardingChecklist.update({
        where: { tenantId: user.tenantId },
        data: { completedAt: new Date() },
      });
    }
    return updated;
  });

  return NextResponse.json({ data: checklist });
}
