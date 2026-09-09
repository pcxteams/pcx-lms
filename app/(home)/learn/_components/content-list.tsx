'use client';

import { useState } from 'react';
import { VideoPlayer } from '@/components/video-player';
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

  const markCompleted = (id: string) => {
    setContentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: true } : item))
    );
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
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between text-left"
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
            {isOpen && (
              <div className="mt-4">
                <VideoPlayer
                  workspaceId={workspaceId}
                  contentId={item.id}
                  config={item.config as VideoConfig}
                  onComplete={() => markCompleted(item.id)}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
