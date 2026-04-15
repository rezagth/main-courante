import { NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/authorization';
import { cachedJson } from '@/lib/cache';
import { prismaAdmin } from '@/lib/prisma';

function dateRange(searchParams: URLSearchParams) {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const now = new Date();
  const startDefault = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return {
    from: from ? new Date(from) : startDefault,
    to: to ? new Date(to) : now,
  };
}

export async function GET(request: Request) {
  const user = await requireAnyRole(['CHEF_EQUIPE', 'PATRON', 'SUPER_ADMIN']);
  const { searchParams } = new URL(request.url);
  const { from, to } = dateRange(searchParams);
  const typeId = searchParams.get('typeId') || undefined;
  const agentId = searchParams.get('agentId') || undefined;
  const inactivityMinutes = Number(searchParams.get('inactivityMinutes') ?? '30');
  const cacheKey = `analytics:chef:${user.tenantId}:${from.toISOString()}:${to.toISOString()}:${typeId ?? 'all'}:${agentId ?? 'all'}:${inactivityMinutes}`;

  const data = await cachedJson(cacheKey, async () => {
      const where = {
        tenantId: user.tenantId,
        deletedAt: null,
        timestamp: { gte: from, lte: to },
        ...(typeId ? { typeEvenementId: typeId } : {}),
        ...(agentId ? { userId: agentId } : {}),
      };

      const baseWhere = {
        tenantId: user.tenantId,
        deletedAt: null,
        timestamp: { gte: from, lte: to },
      };

      const [count, byType, recent, byAgent, typeOptions, agentOptions] = await Promise.all([
        prismaAdmin.entreeMainCourante.count({ where }),
        prismaAdmin.entreeMainCourante.groupBy({
          by: ['typeEvenementId'],
          where,
          _count: { _all: true },
        }),
        prismaAdmin.entreeMainCourante.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: 20,
          include: {
            typeEvenement: { select: { label: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        prismaAdmin.entreeMainCourante.groupBy({
          by: ['userId'],
          where,
          _count: { _all: true },
          _max: { timestamp: true },
        }),
        prismaAdmin.typeEvenement.findMany({
          where: { tenantId: user.tenantId, isActive: true },
          select: { id: true, label: true },
          orderBy: { label: 'asc' },
        }),
        prismaAdmin.entreeMainCourante.groupBy({
          by: ['userId'],
          where: baseWhere,
          _count: { _all: true },
          _max: { timestamp: true },
        }),
      ]);

      const typeIds = byType.map((item) => item.typeEvenementId);
      const types = typeIds.length
        ? await prismaAdmin.typeEvenement.findMany({
            where: { tenantId: user.tenantId, id: { in: typeIds } },
            select: { id: true, label: true },
          })
        : [];
      const typeMap = Object.fromEntries(types.map((t) => [t.id, t.label]));

      const agentIds = byAgent.map((item) => item.userId);
      const agentOptionIds = agentOptions.map((item) => item.userId);
      const agents = agentIds.length
        ? await prismaAdmin.user.findMany({
            where: { tenantId: user.tenantId, id: { in: agentIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
      const agentsForOptions = agentOptionIds.length
        ? await prismaAdmin.user.findMany({
            where: { tenantId: user.tenantId, id: { in: agentOptionIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
      const agentMap = Object.fromEntries(
        agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
      );
      const optionAgentMap = Object.fromEntries(
        agentsForOptions.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
      );

      const lastEntry = recent[0]?.timestamp ?? null;
      const noEntryAlert =
        !lastEntry || Date.now() - new Date(lastEntry).getTime() > inactivityMinutes * 60_000;

      return {
        volumeToday: count,
        byType: byType.map((item) => ({
          typeId: item.typeEvenementId,
          label: typeMap[item.typeEvenementId] ?? 'Type inconnu',
          count: item._count._all,
        })),
        recent,
        byAgent: byAgent.map((item) => ({
          userId: item.userId,
          agentName: agentMap[item.userId] ?? 'Agent inconnu',
          count: item._count._all,
          lastActivity: item._max.timestamp,
        })),
        typeOptions: typeOptions.map((item) => ({ id: item.id, label: item.label })),
        agentOptions: agentOptions.map((item) => ({
          userId: item.userId,
          agentName: optionAgentMap[item.userId] ?? 'Agent inconnu',
        })),
        refreshedAt: new Date().toISOString(),
        noEntryAlert,
      };
  });

  return NextResponse.json(data);
}
