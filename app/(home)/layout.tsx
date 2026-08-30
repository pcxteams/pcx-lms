import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { TopNav } from './_components/top-nav';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // An "agents only" gate previously lived here, checked via /workspaces/me.
  // Removed: that endpoint is built for managers/leaders (resolveMyWorkspaceId
  // only resolves a workspace via primary_workspace_id or a manager/leader
  // membership) and does not resolve a plain agent's workspace at all. There
  // is currently no backend way for an agent to discover their own workspace
  // from just their session. Deferred to the Career Builder work, which needs
  // to resolve exactly this (agent's workspace, tier, membership) for the
  // ranking engine — see [[project-career-builder-ai-pivot]]. Low risk for
  // now: every page behind this layout is still an empty stub.
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopNav email={session.user.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
