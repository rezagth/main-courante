import { PatronDashboard } from '@/components/dashboard/patron-dashboard';
import { auth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function PatronHomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['PATRON', 'SUPER_ADMIN'])) redirect('/');
  return <PatronDashboard />;
}
