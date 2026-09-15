import { apiGet } from '@/lib/api';
import type { MyAgentContext, MyLearningPlanResponse, MyTopic } from '@/lib/career-builder';
import { getExplanation } from '@/lib/career-builder';
import type { ContentListResponse } from '@/lib/content';
import { ComingSoon } from '../_components/coming-soon';
import { SkillsDevelopment } from '../_components/skills-development';
import { LearnContent } from './_components/learn-content';

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; step?: string }>;
}) {
  const myContext = await apiGet<MyAgentContext | null>('/career-builder/me');
  if (!myContext) {
    return <ComingSoon title="Learn" description="No active agent workspace found." />;
  }

  const { topic: topicParam, step: stepParam } = await searchParams;

  const [topics, planResponse, content] = await Promise.all([
    apiGet<MyTopic[]>('/career-builder/topics'),
    apiGet<MyLearningPlanResponse>('/career-builder/plan'),
    apiGet<ContentListResponse>(`/workspaces/${myContext.workspaceId}/content?pageSize=100`),
  ]);

  const topicList = topics ?? [];
  const topItem = planResponse?.queue[0];
  const topItemWhy = topItem ? getExplanation(topItem) : undefined;
  const topItemTopic = topItem
    ? topicList.find((t) => t.sections.some((s) => s.steps.some((step) => step.id === topItem.id)))
    : undefined;

  const selectedTopic = topicList.find((t) => t.id === topicParam) ?? topItemTopic ?? topicList[0];

  if (!selectedTopic) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 sm:px-6 sm:pt-7">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Learn</h1>
        <p className="mt-1 text-sm text-gray-500">
          Training, videos, resources and the library your office publishes.
        </p>
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">Nothing to show yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Your office hasn&apos;t added any content yet — check back soon.
          </p>
        </div>
      </div>
    );
  }

  const allSteps = selectedTopic.sections.flatMap((s) => s.steps);
  const selectedStepId =
    (stepParam && allSteps.some((s) => s.id === stepParam) ? stepParam : undefined) ??
    (selectedTopic.id === topItemTopic?.id ? topItem?.id : undefined) ??
    allSteps.find((s) => !s.completed)?.id ??
    allSteps[0]?.id;

  const contentById = new Map((content?.items ?? []).map((item) => [item.id, item]));
  const selectedItem = selectedStepId ? contentById.get(selectedStepId) : undefined;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 sm:px-6 sm:pt-7">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Learn</h1>
      <p className="mt-1 text-sm text-gray-500">
        Training, videos, resources and the library your office publishes.
      </p>

      {topicList.length > 0 && (
        <div className="mt-6">
          <SkillsDevelopment topics={topicList} title="Your certifications" />
        </div>
      )}

      {selectedItem ? (
        <LearnContent
          workspaceId={myContext.workspaceId}
          topic={selectedTopic}
          selectedStepId={selectedItem.id}
          selectedItem={selectedItem}
          topItemId={topItem?.id}
          topItemWhy={topItemWhy}
        />
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">Nothing to show yet</p>
          <p className="mt-1 text-sm text-gray-400">
            This topic doesn&apos;t have any published content yet.
          </p>
        </div>
      )}
    </div>
  );
}
