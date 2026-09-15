'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import type { MyTopic } from '@/lib/career-builder';
import type { ContentSummary } from '@/lib/content';
import { ContentViewer } from './content-viewer';
import { Attachments } from './attachments';

const TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  resource: 'Resource',
  external_link: 'Link',
  leader_verification: 'Verification',
  instruction: 'Guide',
  plain_text: 'Reading',
};

/** A simple, honest per-step reason — priority/requirement only, no fabricated AI text for items the ranking engine never scored. */
function stepWhy(item: ContentSummary): string {
  const bits: string[] = [];
  if (item.category) bits.push(`part of ${item.category}`);
  if (item.type === 'video' || item.type === 'resource')
    bits.push(`a ${TYPE_LABEL[item.type].toLowerCase()}`);
  return bits.length > 0
    ? `This is ${bits.join(', ')} in your path.`
    : 'Part of your learning path.';
}

export function LearnContent({
  workspaceId,
  topic,
  selectedStepId,
  selectedItem,
  topItemId,
  topItemWhy,
}: {
  workspaceId: string;
  topic: MyTopic;
  selectedStepId: string;
  selectedItem: ContentSummary;
  /** The queue's top-ranked item id, if it's in this topic — gets the real LLM why-text instead of the generic one. */
  topItemId?: string;
  topItemWhy?: string;
}) {
  const [completedOverride, setCompletedOverride] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');

  const isCompleted = completedOverride[selectedStepId] ?? selectedItem.completed;
  const why = selectedStepId === topItemId && topItemWhy ? topItemWhy : stepWhy(selectedItem);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topic.sections;
    return topic.sections
      .map((section) => ({
        ...section,
        steps: section.steps.filter((step) => step.title.toLowerCase().includes(q)),
      }))
      .filter((section) => section.steps.length > 0);
  }, [topic.sections, query]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <ContentViewer
          workspaceId={workspaceId}
          item={selectedItem}
          completed={isCompleted}
          onCompletedChange={(completed) =>
            setCompletedOverride((prev) => ({ ...prev, [selectedStepId]: completed }))
          }
        />

        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              {TYPE_LABEL[selectedItem.type] ?? selectedItem.type}
            </span>
            {selectedItem.category && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                {selectedItem.category}
              </span>
            )}
            {isCompleted && (
              <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                Completed
              </span>
            )}
          </div>
          <h1 className="mt-2 text-lg font-bold text-gray-900">{selectedItem.title}</h1>
          {selectedItem.description && (
            <p className="mt-1 text-sm text-gray-500">{selectedItem.description}</p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold">Why:</span> {why}
          </p>
        </div>

        <Attachments
          workspaceId={workspaceId}
          contentId={selectedItem.id}
          attachments={selectedItem.attachments}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
              Your path
            </h2>
            <span className="text-xs text-gray-400">{topic.totalSteps}</span>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this path…"
            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 focus:border-teal-400 focus:outline-none"
          />
          {filteredSections.map((section) => (
            <div key={section.id} className="mt-3 first:mt-0">
              <p className="mb-1 text-[11px] font-medium text-gray-400">{section.title}</p>
              {section.steps.map((step) => {
                const active = step.id === selectedStepId;
                const done = completedOverride[step.id] ?? step.completed;
                return (
                  <Link
                    key={step.id}
                    href={`/learn?topic=${topic.id}&step=${step.id}`}
                    className={`-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 ${
                      active ? 'bg-teal-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] ${
                        active
                          ? 'bg-teal-600 text-white'
                          : done
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {done && !active ? '✓' : <Play size={11} fill="currentColor" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${
                          active ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {[section.title, step.estTime].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {step.assignmentStatus === 'required' && !done && (
                      <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        Required
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          {filteredSections.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">No matching steps.</p>
          )}
        </div>
      </div>
    </div>
  );
}
