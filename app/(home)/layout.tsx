import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { apiGet } from '@/lib/api';
import type { MyAgentContext } from '@/lib/career-builder';
import { TopNav } from './_components/top-nav';
import { OnboardingSurvey } from './_components/onboarding-survey';
import { SignOutButton } from './_components/sign-out-button';

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm rounded-xl border border-gray-100 bg-white px-8 py-10 text-center">
          <h1 className="text-lg font-bold text-gray-900">No active agent workspace found</h1>
          <p className="mt-2 text-sm text-gray-500">
            Contact your administrator if you believe this is a mistake.
          </p>
          <SignOutButton className="mt-6 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
      </div>
    );
  }

  // A valid onboarding submission always produces 1–3 focus categories, so an
  // empty array is a reliable "hasn't completed the survey yet" signal.
  if (myContext.focusCategories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OnboardingSurvey />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav name={session.user.name} email={session.user.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
