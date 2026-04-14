import { NextResponse } from 'next/server';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { prismaAdmin } from '@/lib/prisma';
import { s3 } from '@/lib/s3';
import { logger } from '@/lib/logger';
import { readApiHealth } from '@/lib/observability';

const startedAt = Date.now();

export async function GET() {
  const checks = {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    db: false,
    s3: false,
  };

  try {
    await prismaAdmin.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (error) {
    logger.error('status_db_failed', { error: String(error) });
  }

  try {
    const bucket = process.env.S3_BUCKET_NAME;
    if (bucket) {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      checks.s3 = true;
    }
  } catch (error) {
    logger.error('status_s3_failed', { error: String(error) });
  }

  return NextResponse.json({
    alerts: {
      ...(await readApiHealth('v1_entries')),
    },
    status: checks.db && checks.s3 ? 'ok' : 'degraded',
    ...checks,
  });
}
