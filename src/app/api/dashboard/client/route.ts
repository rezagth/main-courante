import { NextResponse } from 'next/server';
import { Gravite } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { requireAnyRole } from '@/lib/authorization';
import { cachedJson } from '@/lib/cache';
import { prismaAdmin } from '@/lib/prisma';

function parseGravite(value: string | null): Gravite | undefined {
  if (!value) return undefined;
  return Object.values(Gravite).includes(value as Gravite) ? (value as Gravite) : undefined;
}

function buildWhere(searchParams: URLSearchParams) {
  const now = new Date();
  const days = Number(searchParams.get('days') ?? '30');
  const from = searchParams.get('from')
    ? new Date(searchParams.get('from') as string)
    : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const to = searchParams.get('to') ? new Date(searchParams.get('to') as string) : now;
  const typeId = searchParams.get('typeId') || undefined;
  const agentId = searchParams.get('agentId') || undefined;
  const siteId = searchParams.get('siteId') || undefined;
  const gravite = parseGravite(searchParams.get('gravite'));
  const query = searchParams.get('q') || undefined;
  const take = Math.min(Number(searchParams.get('take') ?? '20'), 100);
  const page = Math.max(Number(searchParams.get('page') ?? '0'), 0);

  const where: Prisma.EntreeMainCouranteWhereInput = {
    deletedAt: null,
    timestamp: { gte: from, lte: to },
    ...(typeId ? { typeEvenementId: typeId } : {}),
    ...(agentId ? { userId: agentId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(gravite ? { gravite } : {}),
    ...(query
      ? {
          OR: [
            { description: { contains: query, mode: 'insensitive' } },
            { localisation: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return {
    from,
    to,
    take,
    page,
    where,
  };
}

export async function GET(request: Request) {
  const user = await requireAnyRole(['CLIENT', 'CHEF_EQUIPE', 'PATRON', 'SUPER_ADMIN']);
  const { searchParams } = new URL(request.url);
  const params = buildWhere(searchParams);
  const key = `analytics:client:${user.tenantId}:${JSON.stringify(params)}`;

  const payload = await cachedJson(key, async () => {
      const scopedWhere = { tenantId: user.tenantId, ...params.where };
      const [rows, total, bySite, byType, byAgent, trend] = await Promise.all([
        prismaAdmin.entreeMainCourante.findMany({
          where: scopedWhere,
          include: {
            site: { select: { name: true } },
            user: { select: { firstName: true, lastName: true } },
            typeEvenement: { select: { label: true } },
          },
          orderBy: { timestamp: 'desc' },
          skip: params.page * params.take,
          take: params.take,
        }),
        prismaAdmin.entreeMainCourante.count({ where: scopedWhere }),
        prismaAdmin.entreeMainCourante.groupBy({
          by: ['siteId'],
          where: scopedWhere,
          _count: { _all: true },
        }),
        prismaAdmin.entreeMainCourante.groupBy({
          by: ['typeEvenementId'],
          where: scopedWhere,
          _count: { _all: true },
        }),
        prismaAdmin.entreeMainCourante.groupBy({
          by: ['userId'],
          where: scopedWhere,
          _count: { _all: true },
        }),
        prismaAdmin.entreeMainCourante.findMany({
          where: scopedWhere,
          select: { timestamp: true },
          orderBy: { timestamp: 'asc' },
        }),
      ]);

      const sites = await prismaAdmin.site.findMany({
        where: { tenantId: user.tenantId, id: { in: bySite.map((x) => x.siteId) } },
        select: { id: true, name: true },
      });
      const siteMap = Object.fromEntries(sites.map((s) => [s.id, s.name]));

      const types = await prismaAdmin.typeEvenement.findMany({
        where: { tenantId: user.tenantId, id: { in: byType.map((x) => x.typeEvenementId) } },
        select: { id: true, label: true },
      });
      const typeMap = Object.fromEntries(types.map((t) => [t.id, t.label]));

      const users = await prismaAdmin.user.findMany({
        where: { tenantId: user.tenantId, id: { in: byAgent.map((x) => x.userId) } },
        select: { id: true, firstName: true, lastName: true },
      });
      const userMap = Object.fromEntries(
        users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
      );

      const heatmap = Array.from({ length: 7 }).flatMap((_, day) =>
        Array.from({ length: 24 }).map((__, hour) => ({
          day,
          hour,
          count: 0,
        })),
      );
      trend.forEach((item) => {
        const dt = new Date(item.timestamp);
        const slot = heatmap.find((h) => h.day === dt.getUTCDay() && h.hour === dt.getUTCHours());
        if (slot) slot.count += 1;
      });

      return {
        rows,
        total,
        nextPage: (params.page + 1) * params.take < total ? params.page + 1 : null,
        bySite: bySite.map((x) => ({ siteId: x.siteId, label: siteMap[x.siteId] ?? 'Site', count: x._count._all })),
        byType: byType.map((x) => ({
          typeId: x.typeEvenementId,
          label: typeMap[x.typeEvenementId] ?? 'Type',
          count: x._count._all,
        })),
        byAgent: byAgent.map((x) => ({
          userId: x.userId,
          label: userMap[x.userId] ?? 'Agent',
          count: x._count._all,
        })),
        trend: trend.map((x) => ({ timestamp: x.timestamp })),
        heatmap,
      };
  });

  return NextResponse.json(payload);
}
