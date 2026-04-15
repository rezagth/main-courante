import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';
import { EntryCreateForm } from '@/components/agent/entry-create-form';

export default async function AgentEntryCreatePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['AGENT', 'SUPER_ADMIN'])) redirect(resolveDefaultDashboardPath(session.user.roles));

  return <EntryCreateForm />;
}
