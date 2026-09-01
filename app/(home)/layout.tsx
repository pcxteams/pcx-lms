import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { apiGet } from '@/lib/api';
import type { MyAgentContext } from '@/lib/career-builder';
import { TopNav } from './_components/top-nav';
import { OnboardingSurvey } from './_components/onboarding-survey';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // The previous "agents only" gate here (via /workspaces/me) was removed —
  // that endpoint is manager/leader-only by design and can't resolve a plain
  // agent's workspace. This uses the real capability built for exactly this
  // (GET /career-builder/me), so it's reliable rather than a guess.
  const myContext = await apiGet<MyAgentContext | null>('/career-builder/me');

  if (!myContext) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-lg font-bold text-slate-900">No active agent workspace found</h1>
          <p className="mt-2 text-sm text-slate-500">
            Contact your administrator if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  // A valid onboarding submission always produces 1–3 focus categories, so an
  // empty array is a reliable "hasn't completed the survey yet" signal.
  if (myContext.focusCategories.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <OnboardingSurvey />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopNav email={session.user.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
