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

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No content yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <li key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="font-semibold text-slate-900">{item.title}</span>
                {item.category && (
                  <span className="ml-2 text-xs text-slate-400">{item.category}</span>
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
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
