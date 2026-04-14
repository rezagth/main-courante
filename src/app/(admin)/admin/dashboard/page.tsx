import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (!hasAnyRole(session.user.roles, ['SUPER_ADMIN'])) {
    redirect(resolveDefaultDashboardPath(session.user.roles));
  }
  return <AdminDashboard />;
}
