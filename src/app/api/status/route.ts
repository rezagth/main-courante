import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { readApiHealth } from '@/lib/observability';

const startedAt = Date.now();

export async function GET() {
  const checks = {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    db: false,
    storage: false,
  };

  try {
    await prismaAdmin.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (error) {
    logger.error('status_db_failed', { error: String(error) });
  }

  try {
    await prismaAdmin.$queryRaw`
      SELECT COALESCE(SUM(photo_size_bytes), 0)
      FROM "entrees_main_courante"
      WHERE deleted_at IS NULL
    `;
    checks.storage = true;
  } catch (error) {
    logger.error('status_storage_failed', { error: String(error) });
  }

  return NextResponse.json({
    alerts: {
      ...(await readApiHealth('v1_entries')),
    },
    status: checks.db && checks.storage ? 'ok' : 'degraded',
    ...checks,
  });
}
