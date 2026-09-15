'use client';

import { useState } from 'react';
import { apiClientDelete, apiClientPost } from '@/lib/api-client';
import {
  getExplanation,
  type LearningPlan,
  type LearningPlanStep,
  type RankedContentItem,
} from '@/lib/career-builder';

const PRIORITY_TAG: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  very_important: 'bg-amber-50 text-amber-700',
  important: 'bg-gray-100 text-gray-600',
};

const STATUS_TAG: Record<string, string> = {
  required: 'bg-blue-50 text-blue-700',
  recommended: 'bg-teal-50 text-teal-700',
  optional: 'bg-gray-100 text-gray-600',
};

const TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  resource: 'Resource',
  external_link: 'Link',
  leader_verification: 'Verification',
  instruction: 'Guide',
  plain_text: 'Reading',
};

/** Small pill — matches the mock's tag scale exactly (10px, px-1.5 py-0.5, rounded not rounded-md). */
const TAG_CLASS = 'rounded px-1.5 py-0.5 text-[10px] font-semibold';

function priorityLabel(p: string): string {
  return p === 'very_important' ? 'Very Important' : p.charAt(0).toUpperCase() + p.slice(1);
}

function ItemTags({ item }: { item: RankedContentItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`${TAG_CLASS} ${PRIORITY_TAG[item.priority] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {priorityLabel(item.priority)}
      </span>
      <span
        className={`${TAG_CLASS} ${STATUS_TAG[item.assignmentStatus] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {item.assignmentStatus.charAt(0).toUpperCase() + item.assignmentStatus.slice(1)}
      </span>
      {item.category && (
        <span className={`${TAG_CLASS} bg-gray-100 text-gray-500`}>{item.category}</span>
      )}
      <span className={`${TAG_CLASS} bg-gray-100 text-gray-500`}>
        {TYPE_LABEL[item.type] ?? item.type}
      </span>
    </div>
  );
}

interface Props {
  workspaceId: string;
  items: RankedContentItem[];
  plan: LearningPlan | null;
}

/**
 * Home's "Next best actions" — one card, the top item highlighted inline
 * (title + why + actions), the rest as plain rows below it, matching the
 * current Cockpit direction's PriorityList pattern (no separate "Why this"
 * side panel — that's the previous direction's AiSuggestion pattern).
 * Marking an item complete calls the same content-completion endpoint
 * Learn's ContentViewer uses; completed items move into a "Done" list
 * locally with an Undo, same as before.
 */
export function LearningQueue({ workspaceId, items, plan }: Props) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const visible = items.filter((item) => !completedIds.has(item.id));
  const doneItems = items.filter((item) => completedIds.has(item.id));

  async function markComplete(id: string) {
    setPendingId(id);
    setErrorId(null);
    const res = await apiClientPost<{ completed: boolean }>(
      `/workspaces/${workspaceId}/content/${id}/complete`
    );
    setPendingId(null);
    if (res) {
      setCompletedIds((prev) => new Set(prev).add(id));
    } else {
      setErrorId(id);
    }
  }

  async function undoComplete(id: string) {
    setPendingId(id);
    setErrorId(null);
    const res = await apiClientDelete<{ completed: boolean }>(
      `/workspaces/${workspaceId}/content/${id}/complete`
    );
    setPendingId(null);
    if (res) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setErrorId(id);
    }
  }

  const itemById = new Map(visible.map((item) => [item.id, item]));
  const planSteps = plan
    ? [...plan.steps]
        .sort((a, b) => a.order - b.order)
        .map((step) => ({ step, item: itemById.get(step.itemId) }))
        .filter((entry): entry is { step: LearningPlanStep; item: RankedContentItem } =>
          Boolean(entry.item)
        )
    : [];

  let entries: { item: RankedContentItem; tip?: string }[];
  let planSummary: string | null = null;

  if (planSteps.length > 0) {
    entries = planSteps.map((entry) => ({ item: entry.item, tip: entry.step.tip }));
    planSummary = plan!.planSummary;
  } else {
    entries = visible.map((item) => ({ item }));
  }

  return (
    <div className="space-y-6">
      {entries.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
              Next best actions
            </h2>
            <span className="text-xs text-gray-400">{entries.length} open</span>
          </div>
          <div className="space-y-1.5">
            {entries.map(({ item, tip }, index) => (
              <Row
                key={item.id}
                item={item}
                tip={tip}
                top={index === 0}
                pending={pendingId === item.id}
                hasError={errorId === item.id}
                onComplete={() => void markComplete(item.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-gray-400">
            Nothing left in your queue right now — check back after your office adds more.
          </p>
        </div>
      )}

      {planSummary && (
        <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {planSummary}
        </p>
      )}

      {doneItems.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
            Done, {doneItems.length}
          </h2>
          <ul className="space-y-1.5">
            {doneItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white">
                  ✓
                </span>
                <span className="line-through">{item.title}</span>
                <button
                  onClick={() => void undoComplete(item.id)}
                  disabled={pendingId === item.id}
                  className="text-xs font-medium text-gray-400 underline decoration-dotted underline-offset-2 hover:text-teal-700 disabled:opacity-50"
                >
                  {pendingId === item.id ? 'Undoing…' : 'Undo'}
                </button>
                {errorId === item.id && (
                  <span className="text-xs text-red-600">Couldn&apos;t undo — try again.</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({
  item,
  tip,
  top,
  pending,
  hasError,
  onComplete,
}: {
  item: RankedContentItem;
  tip?: string;
  top: boolean;
  pending: boolean;
  hasError: boolean;
  onComplete: () => void;
}) {
  const why = tip ?? getExplanation(item);

  if (top) {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3.5">
        <p className="text-[11px] font-semibold tracking-[0.09em] text-teal-700 uppercase">
          Next best action
        </p>
        <h3 className="mt-1 text-sm font-semibold text-gray-900">{item.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{why}</p>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={onComplete}
            disabled={pending}
            className="inline-flex items-center rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {pending ? 'Marking…' : 'Mark as complete'}
          </button>
          <ItemTags item={item} />
        </div>
        {hasError && (
          <p className="mt-2 text-xs text-red-600">Couldn&apos;t mark complete — try again.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 border-t border-gray-100 py-2.5 first:border-t-0">
      <button
        onClick={onComplete}
        disabled={pending}
        aria-label={`Mark "${item.title}" as complete`}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 transition-colors hover:border-teal-600 disabled:opacity-50"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-gray-800">{item.title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{why}</p>
        {hasError && (
          <p className="mt-1 text-xs text-red-600">Couldn&apos;t mark complete — try again.</p>
        )}
        <div className="mt-1.5">
          <ItemTags item={item} />
        </div>
      </div>
    </div>
  );
}
