import { apiGet } from '@/lib/api';
import { getSession } from '@/lib/auth/session';
import type { MyAgentContext, MyLearningPlanResponse, MyTopic } from '@/lib/career-builder';
import { LearningQueue } from './_components/home/learning-queue';
import { TodayFocus } from './_components/home/today-focus';
import { SkillsDevelopment } from './_components/skills-development';

export default async function HomePage() {
  const [session, myContext, planResponse, topics] = await Promise.all([
    getSession(),
    apiGet<MyAgentContext | null>('/career-builder/me'),
    apiGet<MyLearningPlanResponse>('/career-builder/plan'),
    apiGet<MyTopic[]>('/career-builder/topics'),
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

      <div className="mt-6 space-y-6">
        {/* Only when the AI plan actually generated — the quote is its real
            planSummary, not a fabricated "annual goal" (no Goals entity yet). */}
        {plan && <TodayFocus quote={plan.planSummary} />}

        {items.length === 0 || !myContext ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
            <p className="text-sm font-medium text-gray-600">Nothing to show yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Your office hasn&apos;t added tagged content for your level yet — check back soon.
            </p>
          </div>
        ) : (
          <LearningQueue workspaceId={myContext.workspaceId} items={items} plan={plan} />
        )}

        {topics && topics.length > 0 && <SkillsDevelopment topics={topics} />}
      </div>
    </div>
  );
}
