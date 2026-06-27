import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { NavSidebar } from '@/components/nav-sidebar';
import { AccountTracker } from '@/components/account-tracker';
import { signOutAction } from '@/lib/actions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <NavSidebar userLogin={session.user.login} onSignOut={signOutAction} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
      <AccountTracker
        login={session.user.login}
        name={session.user.name ?? null}
        image={session.user.image ?? null}
      />
    </div>
  );
}
