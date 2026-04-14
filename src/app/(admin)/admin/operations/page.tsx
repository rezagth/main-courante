import { OperationsPanel } from '@/components/admin/operations-panel';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function AdminOperationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (!hasAnyRole(session.user.roles, ['SUPER_ADMIN'])) {
    redirect(resolveDefaultDashboardPath(session.user.roles));
  }
  return <OperationsPanel />;
}
