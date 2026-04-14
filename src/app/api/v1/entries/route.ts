import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key';
import { prisma, withTenantContext } from '@/lib/prisma';
import { recordApiMetric } from '@/lib/observability';

export async function GET(request: Request) {
  const startedAt = Date.now();
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    await recordApiMetric('v1_entries', 401, Date.now() - startedAt);
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  let tenantKey;
  try {
    tenantKey = await authenticateApiKey(apiKey);
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      await recordApiMetric('v1_entries', 429, Date.now() - startedAt);
      return NextResponse.json({ error: 'Rate limit exceeded (100 req/min)' }, { status: 429 });
    }
    throw error;
  }

  if (!tenantKey) {
    await recordApiMetric('v1_entries', 401, Date.now() - startedAt);
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id') || undefined;
  const dateFrom = searchParams.get('date_from') ? new Date(searchParams.get('date_from') as string) : undefined;
  const dateTo = searchParams.get('date_to') ? new Date(searchParams.get('date_to') as string) : undefined;
  const type = searchParams.get('type') || undefined;
  const take = Math.min(Number(searchParams.get('take') ?? '100'), 500);
  const page = Math.max(Number(searchParams.get('page') ?? '0'), 0);

  const rows = await withTenantContext(tenantKey.tenantId, () =>
    prisma.entreeMainCourante.findMany({
      where: {
        deletedAt: null,
        ...(siteId ? { siteId } : {}),
        ...(type ? { typeEvenement: { code: type } } : {}),
        ...(dateFrom || dateTo
          ? {
              timestamp: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      include: {
        site: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        typeEvenement: { select: { code: true, label: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip: page * take,
      take,
    }),
  );

  await recordApiMetric('v1_entries', 200, Date.now() - startedAt);
  return NextResponse.json({ data: rows, page, take });
}
