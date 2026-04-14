import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { requireAnyRole } from '@/lib/authorization';
import { prisma, withTenantContext } from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await requireAnyRole(['CLIENT', 'CHEF_EQUIPE', 'SUPER_ADMIN']);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from') as string) : undefined;
  const to = searchParams.get('to') ? new Date(searchParams.get('to') as string) : undefined;

  const [tenant, count] = await withTenantContext(user.tenantId, async () =>
    Promise.all([
      prisma.tenant.findFirst({ where: { id: user.tenantId }, select: { name: true } }),
      prisma.entreeMainCourante.count({
        where: {
          deletedAt: null,
          ...(from || to
            ? { timestamp: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
            : {}),
        },
      }),
    ]),
  );

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(tenant?.name ?? 'Tenant', 14, 20);
  doc.setFontSize(12);
  doc.text('Rapport main courante', 14, 30);
  doc.text(`Periode: ${from?.toISOString() ?? 'debut'} -> ${to?.toISOString() ?? 'maintenant'}`, 14, 38);
  doc.text(`Nombre total d'entrees: ${count}`, 14, 46);
  const buffer = doc.output('arraybuffer');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="main-courante-rapport.pdf"',
    },
  });
}
