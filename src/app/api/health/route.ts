import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    await prismaAdmin.$queryRaw`SELECT 1`;

    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
