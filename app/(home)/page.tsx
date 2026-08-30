import { apiGet } from '@/lib/api';
import { explainRanking, type MyAgentContext, type RankedContentItem } from '@/lib/career-builder';

const PRIORITY_TAG: Record<string, string> = {
  critical: 'bg-red-50 text-red-600',
  very_important: 'bg-amber-50 text-amber-700',
  important: 'bg-slate-100 text-slate-600',
};

const STATUS_TAG: Record<string, string> = {
  required: 'bg-blue-50 text-blue-700',
  recommended: 'bg-teal-50 text-teal-700',
  optional: 'bg-slate-100 text-slate-600',
};

function priorityLabel(p: string): string {
  return p === 'very_important' ? 'Very Important' : p.charAt(0).toUpperCase() + p.slice(1);
}

function ItemTags({ item }: { item: RankedContentItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${PRIORITY_TAG[item.priority] ?? 'bg-slate-100 text-slate-600'}`}
      >
        {priorityLabel(item.priority)}
      </span>
      <span
        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_TAG[item.assignmentStatus] ?? 'bg-slate-100 text-slate-600'}`}
      >
        {item.assignmentStatus.charAt(0).toUpperCase() + item.assignmentStatus.slice(1)}
      </span>
      {item.category && (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {item.category}
        </span>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [myContext, queue] = await Promise.all([
    apiGet<MyAgentContext | null>('/career-builder/me'),
    apiGet<RankedContentItem[]>('/career-builder/queue'),
  ]);

  const items = queue ?? [];
  const [top, ...rest] = items;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">
        {myContext?.workspaceName ? `Welcome back` : 'Welcome back'}
      </h1>
      <p className="mt-1 text-sm text-slate-500">Here&apos;s what we&apos;d focus on next.</p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">Nothing to show yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Your office hasn&apos;t added tagged content for your level yet — check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {top && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Your next best action
              </p>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-lg font-bold text-slate-900">{top.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{explainRanking(top)}</p>
                <div className="mt-3">
                  <ItemTags item={top} />
                </div>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recommended queue
              </p>
              <div className="space-y-3">
                {rest.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{explainRanking(item)}</p>
                    <div className="mt-2">
                      <ItemTags item={item} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
