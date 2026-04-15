export function resolveDefaultDashboardPath(roles: string[] = []): string {
  if (roles.includes('SUPER_ADMIN')) return '/admin/dashboard';
  if (roles.includes('PATRON')) return '/patron/dashboard';
  if (roles.includes('CHEF_EQUIPE')) return '/chef/dashboard';
  if (roles.includes('CLIENT')) return '/client/dashboard';
  if (roles.includes('AGENT')) return '/agent/dashboard';
  return '/login';
}

export function hasAnyRole(roles: string[] = [], allowed: string[]): boolean {
  return roles.some((role) => allowed.includes(role));
}
