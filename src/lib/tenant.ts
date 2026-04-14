import { headers } from 'next/headers';

const TENANT_HEADER = 'x-tenant-id';

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

export async function getTenantIdOrThrow(): Promise<string> {
  const requestHeaders = await headers();
  const tenantId = requestHeaders.get(TENANT_HEADER);

  if (!tenantId) {
    throw new TenantContextError(`Missing required header: ${TENANT_HEADER}`);
  }

  return tenantId;
}
