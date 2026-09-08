import { apiGet } from '@/lib/api';
import type { MyAgentContext } from '@/lib/career-builder';
import type { ContentListResponse } from '@/lib/content';
import { ComingSoon } from '../_components/coming-soon';
import { ContentList } from './_components/content-list';

export default async function LearnPage() {
  const myContext = await apiGet<MyAgentContext | null>('/career-builder/me');
  if (!myContext) {
    return <ComingSoon title="Learn" description="No active agent workspace found." />;
  }

  const content = await apiGet<ContentListResponse>(
    `/workspaces/${myContext.workspaceId}/content?type=video&pageSize=50`
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Learn</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your full content library is still on its way — this is every video available in your
        workspace today.
      </p>
      <div className="mt-8">
        <ContentList workspaceId={myContext.workspaceId} items={content?.items ?? []} />
      </div>
    </div>
  );
}
