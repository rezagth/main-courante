export const ROLES = {
  AGENT: 'AGENT',
  CHEF_EQUIPE: 'CHEF_EQUIPE',
  CLIENT: 'CLIENT',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export type PermissionCode =
  | 'ENTRY:CREATE'
  | 'ENTRY:READ'
  | 'ENTRY:UPDATE'
  | 'ENTRY:DELETE'
  | 'ENTRY:EXPORT'
  | 'TYPE_EVENT:MANAGE'
  | 'USER:READ';

export type RoleAssignmentScope = {
  tenantId: string;
  siteId?: string | null;
  teamId?: string | null;
  validFrom: Date;
  validTo?: Date | null;
};

export type UserRoleGrant = {
  role: RoleCode;
  permissions: PermissionCode[];
  scope: RoleAssignmentScope;
};

type AccessContext = {
  tenantId: string;
  siteId?: string;
  teamId?: string;
  at?: Date;
};

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  AGENT: ['ENTRY:CREATE', 'ENTRY:READ', 'ENTRY:UPDATE'],
  CHEF_EQUIPE: [
    'ENTRY:CREATE',
    'ENTRY:READ',
    'ENTRY:UPDATE',
    'ENTRY:EXPORT',
    'TYPE_EVENT:MANAGE',
    'USER:READ',
  ],
  CLIENT: ['ENTRY:READ'],
  SUPER_ADMIN: [
    'ENTRY:CREATE',
    'ENTRY:READ',
    'ENTRY:UPDATE',
    'ENTRY:DELETE',
    'ENTRY:EXPORT',
    'TYPE_EVENT:MANAGE',
    'USER:READ',
  ],
};

const isGrantActive = (grant: UserRoleGrant, at: Date): boolean => {
  const { validFrom, validTo } = grant.scope;
  return validFrom <= at && (!validTo || validTo >= at);
};

const isScopeMatch = (grant: UserRoleGrant, ctx: AccessContext): boolean => {
  const grantScope = grant.scope;
  if (grantScope.tenantId !== ctx.tenantId) {
    return false;
  }

  if (grantScope.siteId && grantScope.siteId !== ctx.siteId) {
    return false;
  }

  if (grantScope.teamId && grantScope.teamId !== ctx.teamId) {
    return false;
  }

  return true;
};

export const hasPermission = (
  grants: UserRoleGrant[],
  permission: PermissionCode,
  ctx: AccessContext,
): boolean => {
  const at = ctx.at ?? new Date();
  return grants.some((grant) => {
    return (
      isGrantActive(grant, at) &&
      isScopeMatch(grant, ctx) &&
      grant.permissions.includes(permission)
    );
  });
};

