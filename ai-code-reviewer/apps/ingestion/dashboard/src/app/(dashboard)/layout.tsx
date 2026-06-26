import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { NavSidebar } from '@/components/nav-sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="flex min-h-screen">
      <NavSidebar userLogin={session.user.login} onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
