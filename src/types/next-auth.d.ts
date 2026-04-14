import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      tenantId: string;
      siteId?: string | null;
      roles: string[];
      impersonatedBy?: string | null;
    };
  }

  interface User {
    tenantId: string;
    siteId?: string | null;
    roles?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId?: string;
    siteId?: string | null;
    roles?: string[];
    sessionJti?: string;
    rotatedAt?: number;
    impersonatedBy?: string;
  }
}
