import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { requireAnyRole } from '@/lib/authorization';
import { prisma, withTenantContext } from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await requireAnyRole(['CLIENT', 'CHEF_EQUIPE', 'SUPER_ADMIN']);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from') as string) : undefined;
  const to = searchParams.get('to') ? new Date(searchParams.get('to') as string) : undefined;
  const columns = (searchParams.get('columns') ?? 'timestamp,type,description,localisation,gravite,site,agent')
    .split(',')
    .map((x) => x.trim());

  const rows = await withTenantContext(user.tenantId, async () =>
    prisma.entreeMainCourante.findMany({
      where: {
        deletedAt: null,
        ...(from || to
          ? {
              timestamp: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        site: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
        typeEvenement: { select: { label: true } },
      },
      orderBy: { timestamp: 'desc' },
    }),
  );

  const exportRows = rows.map((row) => ({
    timestamp: row.timestamp.toISOString(),
    type: row.typeEvenement.label,
    description: row.description,
    localisation: row.localisation ?? '',
    gravite: row.gravite ?? '',
    site: row.site.name,
    agent: `${row.user.firstName} ${row.user.lastName}`.trim(),
  }));
  const csv = Papa.unparse(exportRows, { columns });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="main-courante-export.csv"',
    },
  });
}
