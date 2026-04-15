import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { auth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/role-routing';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!hasAnyRole(session.user.roles, ['SUPER_ADMIN'])) {
    redirect('/');
  }

  return (
    <AppSidebar roles={session.user.roles} userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AppSidebar>
  );
}

