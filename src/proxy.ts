import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { resolveDefaultDashboardPath } from '@/lib/role-routing';

const PUBLIC_API_PREFIXES = ['/api/auth', '/api/status', '/api/v1/openapi'];
const PUBLIC_PATHS = ['/login', '/status'];
const ROLE_PROTECTED_PATHS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/agent', roles: ['AGENT', 'SUPER_ADMIN'] },
  { prefix: '/chef', roles: ['CHEF_EQUIPE', 'PATRON', 'SUPER_ADMIN'] },
  { prefix: '/client', roles: ['CLIENT', 'PATRON', 'SUPER_ADMIN'] },
  { prefix: '/patron', roles: ['PATRON', 'SUPER_ADMIN'] },
  { prefix: '/admin', roles: ['SUPER_ADMIN'] },
];

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('__Secure-authjs.session-token')?.value ||
      request.cookies.get('authjs.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value ||
      request.cookies.get('next-auth.session-token')?.value,
  );
}

export function proxy(request: NextRequest) {
  return handleProxy(request);
}

async function handleProxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicApi || isPublicPath) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? 'dev-only-secret-change-me',
  });
  const roles = (token?.roles as string[] | undefined) ?? [];

  const restricted = ROLE_PROTECTED_PATHS.find((item) => pathname.startsWith(item.prefix));
  if (restricted) {
    const authorized = roles.some((role) => restricted.roles.includes(role));
    if (!authorized) {
      const fallback = resolveDefaultDashboardPath(roles);
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
