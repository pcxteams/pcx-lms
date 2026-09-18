import { Building2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import type { MyAgentContext } from '@/lib/career-builder';
import type { OfficePagePublishedResponse } from '@/lib/office-page-content';
import { ComingSoon } from '../_components/coming-soon';
import OfficePageView, { type AgentOfficeVendor } from './_components/office-page-view';

/**
 * The agent's read of their workspace's published Office Page: the rendered
 * content, with none of the admin's editing chrome.
 *
 * Two fetches, because the page and its vendors publish on separate schedules.
 * `content` stays null until someone publishes (never the draft), while vendors
 * go live on approval. A Free Team's reads resolve to its Parent Office
 * server-side, so the only inheritance handled here is naming it in the banner.
 */
export default async function OfficePage() {
  const myContext = await apiGet<MyAgentContext | null>('/career-builder/me');
  if (!myContext) {
    return (
      <ComingSoon
        title="Office"
        description="Announcements, events, resources, and forms from your office will appear here once you are added to one."
      />
    );
  }

  const [data, vendorData] = await Promise.all([
    apiGet<OfficePagePublishedResponse>(
      `/workspaces/${myContext.workspaceId}/office-page/published`
    ),
    apiGet<{ vendors: AgentOfficeVendor[] }>(`/workspaces/${myContext.workspaceId}/vendors/active`),
  ]);
  const activeVendors = vendorData?.vendors ?? [];

  if (!data || (!data.content && activeVendors.length === 0)) {
    return (
      <ComingSoon
        title="Office"
        description={`${myContext.workspaceName} hasn't published an Office page yet. Check back soon.`}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 sm:px-6 sm:pt-7">
      {/* A Free Team reads its Parent Office's page; say whose it is. */}
      {data.owningWorkspaceName && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Building2 size={15} className="mt-0.5 flex-none text-amber-600" strokeWidth={1.9} />
          <p className="text-xs leading-relaxed text-amber-900">
            Published by <b>{data.owningWorkspaceName}</b>.
          </p>
        </div>
      )}
      <OfficePageView
        content={data.content ?? { sections: [] }}
        brokerage={data.brokerage}
        directory={data.directory ?? {}}
        activeVendors={activeVendors}
      />
    </div>
  );
}
