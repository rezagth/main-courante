import { ClientAnalyticsOverview } from '@/components/analytics/client-client-analytics-overview';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function ClientAnalyticsOverviewPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'SUPER_ADMIN'])) {
    redirect(resolveDefaultDashboardPath(session.user.roles));
  }

  return <ClientAnalyticsOverview />;
}
