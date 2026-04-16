import NextAuth, { getServerSession, type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verify as verifyArgon2 } from 'argon2';
import { randomUUID } from 'node:crypto';
import { prismaAdmin } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logAuditEvent } from '@/lib/audit';
import { assertLoginRateLimit, extractIp } from '@/lib/security';

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const JWT_ROTATION_SECONDS = 60 * 15;

async function storeServerSession(jti: string, payload: Record<string, unknown>) {
  if (!redis) return;
  await redis.set(`session:${jti}`, JSON.stringify(payload), 'EX', SESSION_TTL_SECONDS);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-only-secret-change-me',
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

        if (!email || !password) {
          return null;
        }

        const user = await prismaAdmin.user.findFirst({
          where: { email, isActive: true },
          include: {
            assignments: {
              include: {
                role: true,
              },
            },
          },
        });

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

        const roleCodes = user.assignments.map((assignment: any) => assignment.role.code);
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          tenantId: user.tenantId,
          siteId: user.siteId,
          roles: roleCodes,
        };
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

