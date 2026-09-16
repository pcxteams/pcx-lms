'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { apiClientDelete, apiClientPost } from '@/lib/api-client';
import {
  getExplanation,
  type LearningPlan,
  type LearningPlanStep,
  type RankedContentItem,
} from '@/lib/career-builder';

interface Props {
  workspaceId: string;
  items: RankedContentItem[];
  plan: LearningPlan | null;
}

/**
 * Home's "Next best actions" — styled to match the shipped Cockpit mock's
 * `PriorityList`/`Card`/`CardHead` almost class-for-class: a checkbox-first
 * row (the whole row toggles complete, not a separate button), the top item
 * lifted out and highlighted, plain rows below, a "Done" section whose rows
 * toggle back to undo — same symmetry the mock's `plan.toggle` has, just
 * backed by our real completion/undo endpoint instead of local mock state.
 */
export function LearningQueue({ workspaceId, items, plan }: Props) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const visible = items.filter((item) => !completedIds.has(item.id));
  const doneItems = items.filter((item) => completedIds.has(item.id));

  async function toggle(id: string, currentlyDone: boolean) {
    setPendingId(id);
    setErrorId(null);
    const res = currentlyDone
      ? await apiClientDelete<{ completed: boolean }>(
          `/workspaces/${workspaceId}/content/${id}/complete`
        )
      : await apiClientPost<{ completed: boolean }>(
          `/workspaces/${workspaceId}/content/${id}/complete`
        );
    setPendingId(null);
    if (res) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (currentlyDone) next.delete(id);
        else next.add(id);
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
    // The AI plan only ever curates a short subset of the full candidate
    // list (career-builder-guidance.service.ts caps it at 8 and typically
    // sequences far fewer) — anything still eligible but not chosen for the
    // plan stays in the queue below it, not hidden.
    const planItemIds = new Set(planSteps.map((entry) => entry.item.id));
    entries = [
      ...planSteps.map((entry) => ({ item: entry.item, tip: entry.step.tip })),
      ...visible.filter((item) => !planItemIds.has(item.id)).map((item) => ({ item })),
    ];
    planSummary = plan!.planSummary;
  } else {
    entries = visible.map((item) => ({ item }));
  }

  const [top, ...rest] = entries;

  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-gray-100 pb-3">
        <h2 className="min-w-0 text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
          Next best actions
        </h2>
        <span className="text-[11px] text-gray-400">{entries.length} open</span>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Nothing left in your queue right now — check back after your office adds more.
        </p>
      ) : (
        <>
          {top && (
            <Row
              item={top.item}
              tip={top.tip}
              highlight
              pending={pendingId === top.item.id}
              hasError={errorId === top.item.id}
              onToggle={() => void toggle(top.item.id, false)}
            />
          )}

          {planSummary && (
            <p className="mt-3 mb-1 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              {planSummary}
            </p>
          )}

          <ul className="mt-2 grid grid-cols-1 gap-0.5">
            {rest.map(({ item, tip }) => (
              <li key={item.id}>
                <Row
                  item={item}
                  tip={tip}
                  pending={pendingId === item.id}
                  hasError={errorId === item.id}
                  onToggle={() => void toggle(item.id, false)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {doneItems.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.09em] text-gray-400 uppercase">
            Done, {doneItems.length}
          </p>
          <ul className="grid grid-cols-1 gap-0.5">
            {doneItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => void toggle(item.id, true)}
                  disabled={pendingId === item.id}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  <Checkbox on />
                  <span className="text-sm text-gray-400 line-through">{item.title}</span>
                  {pendingId === item.id && <span className="text-xs text-gray-400">Undoing…</span>}
                </button>
                {errorId === item.id && (
                  <p className="pl-2 text-xs text-red-600">Couldn&apos;t undo — try again.</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Checkbox({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded border ${
        on ? 'border-teal-600 bg-teal-600 text-white' : 'border-gray-300 bg-white'
      }`}
    >
      {on && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

function Row({
  item,
  tip,
  highlight = false,
  pending,
  hasError,
  onToggle,
}: {
  item: RankedContentItem;
  tip?: string;
  highlight?: boolean;
  pending: boolean;
  hasError: boolean;
  onToggle: () => void;
}) {
  const why = tip ?? getExplanation(item);

  return (
    <>
      <button
        onClick={onToggle}
        disabled={pending}
        className={
          highlight
            ? 'mb-2 flex w-full items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-3 text-left transition-colors hover:bg-teal-50 disabled:opacity-50'
            : 'flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-gray-50 disabled:opacity-50'
        }
      >
        <span className="pt-0.5">
          <Checkbox on={false} />
        </span>
        <span className="min-w-0 flex-1">
          {highlight && (
            <span className="text-[10px] font-semibold tracking-[0.09em] text-teal-700 uppercase">
              Next best action
            </span>
          )}
          <span
            className={
              highlight
                ? 'mt-0.5 block text-sm font-semibold text-gray-900'
                : 'block text-sm text-gray-700'
            }
          >
            {item.title}
          </span>
          <span
            className={`mt-1 block text-xs leading-relaxed ${highlight ? 'text-gray-600' : 'text-gray-400'}`}
          >
            {why}
          </span>
        </span>
        {item.estTime && <span className="pt-0.5 text-xs text-gray-400">{item.estTime}</span>}
      </button>
      {pending && <p className="pl-2 text-xs text-gray-400">Marking…</p>}
      {hasError && (
        <p className="pl-2 text-xs text-red-600">Couldn&apos;t mark complete — try again.</p>
      )}
    </>
  );
}
