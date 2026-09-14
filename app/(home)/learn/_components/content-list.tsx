'use client';

import { useState } from 'react';
import { VideoPlayer } from '@/components/video-player';
import { apiClientDelete, apiClientPost } from '@/lib/api-client';
import type { ContentSummary, VideoConfig } from '@/lib/content';

/** Minimal list-and-play view: click a video's title to expand its player in place. */
export function ContentList({
  workspaceId,
  items,
}: {
  workspaceId: string;
  items: ContentSummary[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Local copy so a completion can update this item's state immediately,
  // without waiting on a full server refetch of the list.
  const [contentItems, setContentItems] = useState(items);
  // Per-item state for the manual "mark as complete" button (any content
  // type, not just video — the ended-event path above is video-only).
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  const setCompleted = (id: string, completed: boolean) => {
    setContentItems((prev) => prev.map((item) => (item.id === id ? { ...item, completed } : item)));
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    setPendingIds((prev) => new Set(prev).add(id));
    setErrorIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const res = completed
      ? await apiClientDelete<{ completed: boolean }>(
          `/workspaces/${workspaceId}/content/${id}/complete`
        )
      : await apiClientPost<{ completed: boolean }>(
          `/workspaces/${workspaceId}/content/${id}/complete`
        );
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (res) {
      setCompleted(id, !completed);
    } else {
      setErrorIds((prev) => new Set(prev).add(id));
    }
  };

  if (contentItems.length === 0) {
    return <p className="text-sm text-slate-500">No content yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {contentItems.map((item) => {
        const isOpen = openId === item.id;
        return (
          <li key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex w-full items-center justify-between gap-3">
              <button
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex flex-1 items-center justify-between text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{item.title}</span>
                  {item.category && <span className="text-xs text-slate-400">{item.category}</span>}
                  {item.completed && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Completed
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-400">{isOpen ? 'Close' : 'Play'}</span>
              </button>
              <button
                onClick={() => void handleToggleComplete(item.id, item.completed)}
                disabled={pendingIds.has(item.id)}
                className="ml-3 shrink-0 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {pendingIds.has(item.id)
                  ? item.completed
                    ? 'Undoing…'
                    : 'Marking…'
                  : item.completed
                    ? 'Undo'
                    : 'Mark as complete'}
              </button>
            </div>
            {errorIds.has(item.id) && (
              <p className="mt-1 text-xs text-red-600">Couldn&apos;t mark complete — try again.</p>
            )}
            {isOpen && (
              <div className="mt-4">
                <VideoPlayer
                  workspaceId={workspaceId}
                  contentId={item.id}
                  config={item.config as VideoConfig}
                  onComplete={() => setCompleted(item.id, true)}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
