import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { auth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/role-routing';

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!hasAnyRole(session.user.roles, ['CLIENT', 'SUPER_ADMIN'])) {
    redirect('/');
  }

  return (
    <AppSidebar roles={session.user.roles} userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AppSidebar>
  );
}

