import { AgentDashboard } from '@/components/dashboard/agent-dashboard';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function AgentDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (!hasAnyRole(session.user.roles, ['AGENT', 'SUPER_ADMIN'])) {
    redirect(resolveDefaultDashboardPath(session.user.roles));
  }
  return <AgentDashboard />;
}
