import { NextResponse } from 'next/server';
import { decode } from 'next-auth/jwt';
import { invalidateServerSession } from '@/lib/auth';

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-only-secret-change-me';
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: true });
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    return NextResponse.json({ ok: true });
  }

  const token = await decode({
    token: rawToken,
    secret: getAuthSecret(),
  });

  const sessionJti = token?.sessionJti as string | undefined;
  if (sessionJti) {
    await invalidateServerSession(sessionJti);
  }

  return NextResponse.json({ ok: true });
}
