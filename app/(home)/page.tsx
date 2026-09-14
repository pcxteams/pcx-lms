import { apiGet } from '@/lib/api';
import { getSession } from '@/lib/auth/session';
import type { MyAgentContext, MyLearningPlanResponse } from '@/lib/career-builder';
import { LearningQueue } from './_components/home/learning-queue';

export default async function HomePage() {
  const [session, myContext, planResponse] = await Promise.all([
    getSession(),
    apiGet<MyAgentContext | null>('/career-builder/me'),
    apiGet<MyLearningPlanResponse>('/career-builder/plan'),
  ]);

  const items = planResponse?.queue ?? [];
  const plan = planResponse?.plan ?? null;
  const firstName = session?.user.name?.split(' ')[0];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 sm:px-6 sm:pt-7">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {myContext && myContext.focusCategories.length > 0
          ? `Focused on ${myContext.focusCategories.join(', ')}.`
          : "Here's what we'd focus on next."}
      </p>

      {items.length === 0 || !myContext ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">Nothing to show yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Your office hasn&apos;t added tagged content for your level yet — check back soon.
          </p>
        </div>
      ) : (
        <LearningQueue workspaceId={myContext.workspaceId} items={items} plan={plan} />
      )}
    </div>
  );
}
