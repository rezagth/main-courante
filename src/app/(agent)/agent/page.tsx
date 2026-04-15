import { AgentDashboard } from '@/components/dashboard/agent-dashboard';
import { auth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function AgentHomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['AGENT', 'SUPER_ADMIN'])) redirect('/');
  return <AgentDashboard />;
}
