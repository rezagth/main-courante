import { TenantOnboardingForm } from '@/components/onboarding/tenant-onboarding-form';
import { auth } from '@/lib/auth';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

export default async function PatronOnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (!hasAnyRole(session.user.roles, ['PATRON', 'SUPER_ADMIN'])) {
    redirect(resolveDefaultDashboardPath(session.user.roles));
  }
  return <TenantOnboardingForm />;
}
