import { ChefAnalyticsOverview } from '@/components/analytics/chef-analytics-overview';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function ChefAnalyticsOverviewPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CHEF_EQUIPE', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  return <ChefAnalyticsOverview />;
}
