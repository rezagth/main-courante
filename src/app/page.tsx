import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { resolveDefaultDashboardPath } from '@/lib/role-routing';

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  redirect(resolveDefaultDashboardPath(session.user.roles));
}
