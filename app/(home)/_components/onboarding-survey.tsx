'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXPERIENCE_LENGTH_OPTIONS,
  TRANSACTIONS_CLOSED_OPTIONS,
  TOP_PRIORITY_OPTIONS,
  HELP_AREA_OPTIONS,
  MAX_HELP_AREAS,
} from '@/lib/career-builder';

const RADIO_GROUP = 'space-y-2';
const RADIO_OPTION =
  'flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 cursor-pointer transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700';

function RadioQuestion({
  name,
  question,
  options,
  value,
  onChange,
}: {
  name: string;
  question: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-slate-900">{question}</p>
      <div className={RADIO_GROUP}>
        {options.map((opt) => (
          <label key={opt} className={RADIO_OPTION}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="text-blue-600 focus:ring-blue-500"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export function OnboardingSurvey() {
  const router = useRouter();
  const [experienceLength, setExperienceLength] = useState('');
  const [transactionsClosed, setTransactionsClosed] = useState('');
  const [topPriority, setTopPriority] = useState('');
  const [helpAreas, setHelpAreas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleHelpArea(area: string) {
    setHelpAreas((prev) => {
      if (prev.includes(area)) return prev.filter((a) => a !== area);
      if (prev.length >= MAX_HELP_AREAS) return prev;
      return [...prev, area];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!experienceLength || !transactionsClosed || !topPriority || helpAreas.length === 0) {
      setError('Please answer all four questions before continuing.');
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/career-builder/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ experienceLength, transactionsClosed, topPriority, helpAreas }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Unable to reach the server. Please try again.');
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Let&apos;s build your plan</h1>
        <p className="mt-2 text-sm text-slate-500">
          A few quick questions so we can put the most useful things in front of you first.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <RadioQuestion
          name="experienceLength"
          question="How long have you been actively selling real estate?"
          options={EXPERIENCE_LENGTH_OPTIONS}
          value={experienceLength}
          onChange={setExperienceLength}
        />
        <RadioQuestion
          name="transactionsClosed"
          question="How many transactions did you close in the last 12 months?"
          options={TRANSACTIONS_CLOSED_OPTIONS}
          value={transactionsClosed}
          onChange={setTransactionsClosed}
        />
        <RadioQuestion
          name="topPriority"
          question="What is your #1 priority right now?"
          options={TOP_PRIORITY_OPTIONS}
          value={topPriority}
          onChange={setTopPriority}
        />

        <div>
          <p className="mb-1 text-sm font-semibold text-slate-900">
            Where do you feel you need the most help right now?
          </p>
          <p className="mb-2.5 text-xs text-slate-500">Choose up to {MAX_HELP_AREAS}.</p>
          <div className="grid grid-cols-2 gap-2">
            {HELP_AREA_OPTIONS.map((area) => {
              const checked = helpAreas.includes(area);
              const disabled = !checked && helpAreas.length >= MAX_HELP_AREAS;
              return (
                <label
                  key={area}
                  className={[
                    'flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
                    checked
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : disabled
                        ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                        : 'border-slate-200 text-slate-700 cursor-pointer hover:bg-slate-50',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleHelpArea(area)}
                    className="text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                  />
                  {area}
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Build my plan'}
        </button>
      </form>
    </div>
  );
}
