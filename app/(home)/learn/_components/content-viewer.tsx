'use client';

import { useState } from 'react';
import { BookOpen, FileText, Link2, ShieldCheck, type LucideIcon } from 'lucide-react';
import { VideoPlayer } from '@/components/video-player';
import { apiClientDelete, apiClientGet, apiClientPost } from '@/lib/api-client';
import type {
  ContentSummary,
  DownloadUrlResponse,
  ExternalLinkConfig,
  ResourceConfig,
  TextConfig,
  VideoConfig,
} from '@/lib/content';

/**
 * Type-aware "featured item" viewer — video gets the real player, resource
 * and external_link open (and, per the MVP completion rule, complete
 * themselves on that click), instruction/plain_text render their body
 * inline with a manual Mark as complete. This is what was missing from the
 * old Learn page: it only ever rendered `<VideoPlayer>`, so a Resource item
 * had nowhere to go.
 */
export function ContentViewer({
  workspaceId,
  item,
  completed,
  onCompletedChange,
}: {
  workspaceId: string;
  item: ContentSummary;
  completed: boolean;
  onCompletedChange: (completed: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function markComplete() {
    setPending(true);
    setError(false);
    const res = await apiClientPost<{ completed: boolean }>(
      `/workspaces/${workspaceId}/content/${item.id}/complete`
    );
    setPending(false);
    if (res) onCompletedChange(true);
    else setError(true);
  }

  async function undoComplete() {
    setPending(true);
    setError(false);
    const res = await apiClientDelete<{ completed: boolean }>(
      `/workspaces/${workspaceId}/content/${item.id}/complete`
    );
    setPending(false);
    if (res) onCompletedChange(false);
    else setError(true);
  }

  async function openAndComplete(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!completed) void markComplete();
  }

  async function openResource() {
    const res = await apiClientGet<DownloadUrlResponse>(
      `/workspaces/${workspaceId}/content/${item.id}/download-url`
    );
    if (res) void openAndComplete(res.url);
  }

  if (item.type === 'video') {
    return (
      <div className="space-y-2">
        <VideoPlayer
          // Forces a full remount on every item change — ContentViewer isn't
          // recreated by React on its own between two video items (same
          // component, same position in the tree), so without this key the
          // embed effect below would reuse the previous video's DOM node.
          key={item.id}
          workspaceId={workspaceId}
          contentId={item.id}
          config={item.config as VideoConfig}
          onComplete={() => onCompletedChange(true)}
        />
        {/* The `ended` event is the primary signal, but the MVP completion rule for
            video is "ends OR Mark as Complete" — an agent who already knows the
            material, or who watched it elsewhere, shouldn't have to sit through
            it again just to check the box. */}
        <CompletionControl
          completed={completed}
          pending={pending}
          error={error}
          onMarkComplete={() => void markComplete()}
          onUndo={() => void undoComplete()}
        />
      </div>
    );
  }

  if (item.type === 'resource') {
    const cfg = item.config as ResourceConfig;
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-gray-900 px-6 text-center text-white">
        <FileText size={28} />
        <p className="max-w-xs truncate text-sm font-medium">{cfg.fileName}</p>
        <button
          onClick={() => void openResource()}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold hover:bg-teal-700"
        >
          Open resource
        </button>
      </div>
    );
  }

  if (item.type === 'external_link') {
    const cfg = item.config as ExternalLinkConfig;
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-gray-900 px-6 text-center text-white">
        <Link2 size={28} />
        <button
          onClick={() => void openAndComplete(cfg.url)}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold hover:bg-teal-700"
        >
          Open link
        </button>
      </div>
    );
  }

  // instruction / plain_text / leader_verification — text body, manual completion.
  const body = (item.config as TextConfig | undefined)?.body;
  const { icon: Icon, label } = TEXT_TYPE_META[item.type] ?? TEXT_TYPE_META.plain_text;
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon size={16} />
        </span>
        <span className="text-xs font-semibold tracking-[0.08em] text-gray-500 uppercase">
          {label}
        </span>
      </div>
      {body ? (
        <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-700">{body}</p>
      ) : (
        <p className="mt-4 text-sm text-gray-400">No additional content.</p>
      )}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <CompletionControl
          completed={completed}
          pending={pending}
          error={error}
          onMarkComplete={() => void markComplete()}
          onUndo={() => void undoComplete()}
        />
      </div>
    </div>
  );
}

const TEXT_TYPE_META: Record<string, { icon: LucideIcon; label: string }> = {
  instruction: { icon: BookOpen, label: 'Guide' },
  plain_text: { icon: BookOpen, label: 'Reading' },
  leader_verification: { icon: ShieldCheck, label: 'Verification' },
};

/** Manual completion toggle, shared by every content type — video's `ended` event and resource/link's auto-complete-on-open are additional triggers, never a replacement for this one. */
function CompletionControl({
  completed,
  pending,
  error,
  onMarkComplete,
  onUndo,
}: {
  completed: boolean;
  pending: boolean;
  error: boolean;
  onMarkComplete: () => void;
  onUndo: () => void;
}) {
  return (
    <>
      {completed ? (
        <button
          onClick={onUndo}
          disabled={pending}
          className="text-xs font-medium text-gray-500 underline decoration-dotted underline-offset-2 hover:text-teal-700 disabled:opacity-50"
        >
          {pending ? 'Undoing…' : '✓ Completed — Undo'}
        </button>
      ) : (
        <button
          onClick={onMarkComplete}
          disabled={pending}
          className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          {pending ? 'Marking…' : 'Mark as complete'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">Couldn&apos;t update — try again.</p>}
    </>
  );
}
