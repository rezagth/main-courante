import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stopImpersonation } from '@/lib/impersonation';

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await stopImpersonation(session.user.tenantId, 'manual-stop');
  return NextResponse.json({ ok: true });
}
