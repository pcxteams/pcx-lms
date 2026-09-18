import { apiGet } from '@/lib/api';
import type { MyAgentContext } from '@/lib/career-builder';
import type { OfficePagePublishedResponse } from '@/lib/office-page-content';
import { ComingSoon } from '../_components/coming-soon';
import OfficePageView, { type AgentOfficeVendor } from './_components/office-page-view';

/**
 * Agent-facing read of the workspace's published Office Page — deliberately
 * just the rendered content (via `OfficePageView`, ported from pcx-admin's
 * builder/preview renderer), with none of the admin's editing chrome. The
 * published endpoint returns `content: null` until an admin/leader has
 * actually published something, never the in-progress draft.
 */
export default async function OfficePage() {
  const myContext = await apiGet<MyAgentContext | null>('/career-builder/me');
  if (!myContext) {
    return (
      <ComingSoon
        title="Office"
        description="Announcements, events, resources, and forms from your office are coming here soon."
      />
    );
  }

  const [data, vendorData] = await Promise.all([
    apiGet<OfficePagePublishedResponse>(
      `/workspaces/${myContext.workspaceId}/office-page/published`
    ),
    // Live, DB-backed vendors are shown independent of whether the page
    // itself has been published (mirrors pcx-admin's read view).
    apiGet<{ vendors: AgentOfficeVendor[] }>(`/workspaces/${myContext.workspaceId}/vendors/active`),
  ]);
  const activeVendors = vendorData?.vendors ?? [];

  if (!data || (!data.content && activeVendors.length === 0)) {
    return (
      <ComingSoon
        title="Office"
        description="Your office hasn't published an Office page yet — check back soon."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 sm:px-6 sm:pt-7">
      <OfficePageView content={data.content ?? { sections: [] }} activeVendors={activeVendors} />
    </div>
  );
}
