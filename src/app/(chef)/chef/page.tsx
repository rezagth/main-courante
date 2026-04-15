import { ChefDashboard } from '@/components/dashboard/chef-dashboard';
import { auth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function ChefHomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CHEF_EQUIPE', 'SUPER_ADMIN'])) redirect('/');
  return <ChefDashboard />;
}
