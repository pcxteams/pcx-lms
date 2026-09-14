'use client';

import { useState } from 'react';
import { apiClientDelete, apiClientPost } from '@/lib/api-client';
import {
  getExplanation,
  rankedFactorReasons,
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

/** Small pill — matches the mock's "Suggested"/priority tag scale exactly (10px, px-1.5 py-0.5, rounded not rounded-md). */
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
 * The restyled Home queue — hero suggestion + "why this" panel, then either
 * the AI-curated plan sequence or the deterministic fallback, matching the
 * two view modes the API already distinguishes (plan possibly null). Marking
 * an item complete calls the same content-completion endpoint ContentList
 * uses on the Learn page; completed items move into a "Done" list locally
 * (optimistic — a refresh naturally drops them since the queue already
 * excludes completed/dismissed assignments server-side).
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

  let hero: RankedContentItem | null = null;
  let heroTip: string | undefined;
  let restEntries: { item: RankedContentItem; tip?: string }[] = [];
  let sectionLabel = 'Recommended queue';
  let planSummary: string | null = null;

  if (planSteps.length > 0) {
    hero = planSteps[0].item;
    heroTip = planSteps[0].step.tip;
    const planItemIds = new Set(planSteps.map((entry) => entry.item.id));
    restEntries = [
      ...planSteps.slice(1).map((entry) => ({ item: entry.item, tip: entry.step.tip })),
      ...visible.filter((item) => !planItemIds.has(item.id)).map((item) => ({ item })),
    ];
    sectionLabel = 'Your learning plan';
    planSummary = plan!.planSummary;
  } else if (visible.length > 0) {
    hero = visible[0];
    restEntries = visible.slice(1).map((item) => ({ item }));
  }

  return (
    <div className="mt-6 space-y-6">
      {hero ? (
        <>
          <Hero
            item={hero}
            tip={heroTip}
            pending={pendingId === hero.id}
            hasError={errorId === hero.id}
            onComplete={() => void markComplete(hero!.id)}
          />

          {planSummary && (
            <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              {planSummary}
            </p>
          )}

          {restEntries.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
                {sectionLabel}
              </h2>
              <div className="space-y-3">
                {restEntries.map(({ item, tip }) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    tip={tip}
                    pending={pendingId === item.id}
                    hasError={errorId === item.id}
                    onComplete={() => void markComplete(item.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-gray-400">
            Nothing left in your queue right now — check back after your office adds more.
          </p>
        </div>
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

function Hero({
  item,
  tip,
  pending,
  hasError,
  onComplete,
}: {
  item: RankedContentItem;
  tip?: string;
  pending: boolean;
  hasError: boolean;
  onComplete: () => void;
}) {
  const reasons = rankedFactorReasons(item);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-0 flex-1 basis-[280px] rounded-xl border border-gray-100 border-l-2 border-l-teal-600 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.09em] text-teal-700 uppercase">
          PCx suggests
        </p>
        <h2 className="mt-1 text-lg font-bold text-gray-900">{item.title}</h2>
        <p className="mt-2 text-sm text-gray-500">{tip ?? getExplanation(item)}</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onComplete}
            disabled={pending}
            className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {pending ? 'Marking…' : 'Mark as complete'}
          </button>
          <span className="text-xs text-gray-400">Score {item.score}</span>
        </div>
        {hasError && (
          <p className="mt-2 text-xs text-red-600">Couldn&apos;t mark complete — try again.</p>
        )}
        <div className="mt-4">
          <ItemTags item={item} />
        </div>
      </div>

      <div className="min-w-0 flex-1 basis-[220px] rounded-xl border border-gray-100 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
          Why this
        </p>
        {reasons.length > 0 ? (
          <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-1.5">
                <span className="text-teal-600">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Next up in your queue.</p>
        )}
      </div>
    </div>
  );
}

function QueueRow({
  item,
  tip,
  pending,
  hasError,
  onComplete,
}: {
  item: RankedContentItem;
  tip?: string;
  pending: boolean;
  hasError: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <button
        onClick={onComplete}
        disabled={pending}
        aria-label={`Mark "${item.title}" as complete`}
        className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-gray-300 transition-colors hover:border-teal-600 disabled:opacity-50"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{tip ?? getExplanation(item)}</p>
        {hasError && (
          <p className="mt-1 text-xs text-red-600">Couldn&apos;t mark complete — try again.</p>
        )}
        <div className="mt-2">
          <ItemTags item={item} />
        </div>
      </div>
    </div>
  );
}
