import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prismaAdmin } from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await requirePermission('ENTRY:READ');
  const { searchParams } = new URL(request.url);

  const take = Math.min(Math.max(Number(searchParams.get('take') ?? '20'), 1), 100);
  const page = Math.max(Number(searchParams.get('page') ?? '0'), 0);
  const query = searchParams.get('query')?.trim();
  const siteId = searchParams.get('siteId') || undefined;
  const teamId = searchParams.get('teamId') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const dateFromRaw = searchParams.get('dateFrom');
  const dateToRaw = searchParams.get('dateTo');

  const dateFrom = dateFromRaw ? new Date(dateFromRaw) : undefined;
  const dateTo = dateToRaw ? new Date(dateToRaw) : undefined;
  const hasValidDateFrom = dateFrom && !Number.isNaN(dateFrom.getTime());
  const hasValidDateTo = dateTo && !Number.isNaN(dateTo.getTime());

  const where: Record<string, unknown> = {
    tenantId: user.tenantId,
    deletedAt: null,
  };

  if (query) {
    where.OR = [
      { description: { contains: query, mode: 'insensitive' } },
      { localisation: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (siteId) where.siteId = siteId;
  if (teamId) where.teamId = teamId;
  if (userId) where.userId = userId;

  if (hasValidDateFrom || hasValidDateTo) {
    where.timestamp = {
      ...(hasValidDateFrom ? { gte: dateFrom } : {}),
      ...(hasValidDateTo ? { lte: dateTo } : {}),
    };
  }

  const [data, sites, teams, agents] = await Promise.all([
    prismaAdmin.entreeMainCourante.findMany({
      where,
      select: {
        id: true,
        timestamp: true,
        description: true,
        localisation: true,
        gravite: true,
        photoUrl: true,
        photoSizeBytes: true,
        site: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        typeEvenement: { select: { id: true, label: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip: page * take,
      take,
    }),
    prismaAdmin.site.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prismaAdmin.team.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, siteId: true },
    }),
    prismaAdmin.user.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return NextResponse.json({
    data,
    nextPage: data.length === take ? page + 1 : null,
    filters: {
      sites,
      teams,
      agents,
    },
  });
}
