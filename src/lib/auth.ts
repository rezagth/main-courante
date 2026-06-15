import NextAuth, { getServerSession, type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { decode, encode } from 'next-auth/jwt';
import { verify as verifyArgon2 } from 'argon2';
import { randomUUID } from 'node:crypto';
import { prismaAdmin } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis';
import { logAuditEvent } from '@/lib/audit';
import { assertLoginRateLimit, extractIp } from '@/lib/security';

export const SESSION_TTL_SECONDS = 60 * 60 * 12;
const JWT_ROTATION_SECONDS = 60 * 15;

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  tenantId: string;
  siteId?: string | null;
  roles: string[];
  impersonatedBy?: string | null;
};

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-only-secret-change-me';
}

async function storeServerSession(jti: string, payload: Record<string, unknown>) {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.set(`session:${jti}`, JSON.stringify(payload), 'EX', SESSION_TTL_SECONDS);
}

export async function invalidateServerSession(jti: string) {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.del(`session:${jti}`);
}

async function isServerSessionValid(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const redis = getRedisClient();
  if (!redis) return true;
  const stored = await redis.get(`session:${jti}`);
  return Boolean(stored);
}

function tokenToSessionUser(token: Record<string, unknown>): SessionUser | null {
  const id = token.sub as string | undefined;
  const tenantId = token.tenantId as string | undefined;
  if (!id || !tenantId) return null;

  return {
    id,
    email: (token.email as string | undefined) ?? null,
    name: (token.name as string | undefined) ?? null,
    tenantId,
    siteId: (token.siteId as string | null | undefined) ?? null,
    roles: (token.roles as string[] | undefined) ?? [],
    impersonatedBy: (token.impersonatedBy as string | undefined) ?? null,
  };
}

export async function authenticateCredentials(
  email: string | undefined,
  password: string | undefined,
  ip: string,
) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return null;
  }

  const user =
    (await prismaAdmin.user.findFirst({
      where: { email: normalizedEmail, isActive: true },
      include: {
        assignments: {
          include: {
            role: true,
          },
        },
      },
    })) ??
    (await prismaAdmin.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
        isActive: true,
      },
      include: {
        assignments: {
          include: {
            role: true,
          },
        },
      },
    }));

  if (!user?.passwordHash) {
    return null;
  }

  const isValid = await verifyArgon2(user.passwordHash, password);
  if (!isValid) {
    return null;
  }

  await prismaAdmin.user.update({
    where: { id: user.id, tenantId: user.tenantId },
    data: { lastLoginAt: new Date() },
  });

  await logAuditEvent({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'AUTH_LOGIN_SUCCESS',
    resource: 'auth',
    ip,
  });

  const roleCodes = user.assignments.map((assignment) => assignment.role.code);

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    tenantId: user.tenantId,
    siteId: user.siteId,
    roles: roleCodes,
  };
}

export async function createAccessToken(user: {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  siteId: string | null;
  roles: string[];
}) {
  const now = Math.floor(Date.now() / 1000);
  const sessionJti = randomUUID();

  await storeServerSession(sessionJti, {
    userId: user.id,
    tenantId: user.tenantId,
    siteId: user.siteId,
    roles: user.roles,
    rotatedAt: now,
  });

  const accessToken = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      siteId: user.siteId,
      roles: user.roles,
      sessionJti,
      rotatedAt: now,
    },
    secret: getAuthSecret(),
    maxAge: SESSION_TTL_SECONDS,
  });

  return { accessToken, sessionJti };
}

export async function getAuthUserFromRequest(request?: Request): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.tenantId) {
    return session.user;
  }

  if (!request) {
    return null;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    return null;
  }

  const token = await decode({
    token: rawToken,
    secret: getAuthSecret(),
  });

  if (!token) {
    return null;
  }

  const sessionJti = token.sessionJti as string | undefined;
  const isValid = await isServerSessionValid(sessionJti);
  if (!isValid) {
    return null;
  }

  return tokenToSessionUser(token as Record<string, unknown>);
}

export async function getBearerTokenFromRequest(request: NextRequestLike): Promise<Record<string, unknown> | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    return null;
  }

  const token = await decode({
    token: rawToken,
    secret: getAuthSecret(),
  });

  if (!token) {
    return null;
  }

  const sessionJti = token.sessionJti as string | undefined;
  const isValid = await isServerSessionValid(sessionJti);
  if (!isValid) {
    return null;
  }

  return token as Record<string, unknown>;
}

type NextRequestLike = {
  headers: {
    get(name: string): string | null;
  };
};

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: 'jwt', maxAge: SESSION_TTL_SECONDS },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const xForwardedFor =
          (request as any)?.headers?.['x-forwarded-for'] ??
          (request as any)?.headers?.get?.('x-forwarded-for') ??
          null;
        const ip = extractIp(Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor);

        await assertLoginRateLimit(ip);

        return authenticateCredentials(email, password, ip);
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch {
        // ignore invalid URL and fallback below
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);
      const currentJti = (token.sessionJti as string | undefined) ?? randomUUID();
      const rotatedAt = (token.rotatedAt as number | undefined) ?? now;
      const shouldRotate = now - rotatedAt >= JWT_ROTATION_SECONDS;
      const nextJti = shouldRotate ? randomUUID() : currentJti;

      if (user) {
        token.sub = user.id;
        token.tenantId = (user as { tenantId: string }).tenantId;
        token.siteId = (user as { siteId?: string | null }).siteId ?? null;
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }

      token.sessionJti = nextJti;
      token.rotatedAt = now;

      if (token.sub && token.tenantId) {
        await storeServerSession(nextJti, {
          userId: token.sub,
          tenantId: token.tenantId,
          siteId: token.siteId,
          roles: token.roles,
          rotatedAt: now,
        });
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }
      session.user.id = token.sub ?? '';
      session.user.tenantId = (token.tenantId as string) ?? '';
      session.user.siteId = (token.siteId as string | null | undefined) ?? null;
      session.user.roles = (token.roles as string[]) ?? [];
      session.user.impersonatedBy = (token.impersonatedBy as string | undefined) ?? null;
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = 'token' in message ? message.token : null;
      const jti = token?.sessionJti as string | undefined;
      if (!jti) return;
      const redis = getRedisClient();
      if (!redis) return;
      await redis.del(`session:${jti}`);
    },
  },
};

const handler = NextAuth(authOptions);

export const handlers = {
  GET: handler,
  POST: handler,
};

export async function auth() {
  return getServerSession(authOptions);
}

