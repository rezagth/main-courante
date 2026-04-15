import { ClientDashboard } from '@/components/dashboard/client-dashboard';
import { auth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function ClientHomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'SUPER_ADMIN'])) redirect('/');
  return <ClientDashboard />;
}
