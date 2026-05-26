import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { TopNav } from './_components/top-nav';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopNav email={session.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
