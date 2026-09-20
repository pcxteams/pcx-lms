'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  CircleAlert,
  Download,
  Inbox,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { apiClientGet } from '@/lib/api-client';
import { money, moneyShort } from '@/lib/format';
import {
  IMPORT_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  deriveFeed,
  fetchYearTransactions,
  type TransactionItem,
  type TransactionsListResponse,
} from '@/lib/transact';

/**
 * The agent's own production for the year, read-only. The API enforces that
 * (an Agent resolves to `mode: 'own'` and `canWrite: false`, and a write
 * attempt 403s) — this view only reflects it, which is why there is no edit
 * control anywhere here.
 */

const STATUS_TINT: Record<string, string> = {
  closed: 'bg-teal-50 text-teal-700',
  active: 'bg-amber-50 text-amber-700',
  signed_client: 'bg-gray-100 text-gray-600',
  pending: 'bg-gray-100 text-gray-600',
  canceled: 'bg-rose-50 text-rose-700',
  appointment_held: 'bg-gray-100 text-gray-600',
};

const COLUMNS = [
  'Status',
  'Type',
  'Client',
  'Property',
  'Close date',
  'Volume',
  'GCI',
  'Your commission',
  'Split',
  '',
] as const;

function Blank() {
  return <span className="text-gray-300">—</span>;
}

/** `closeDate` is date-only text; `createdAt`/`updatedAt` are full ISO
 *  timestamps. Both display as just a date, and parsing the leading
 *  `YYYY-MM-DD` for either avoids a UTC-vs-local day shift. */
function fmtDate(value: string | null): string | null {
  if (!value) return null;
  const [datePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toCsv(rows: TransactionItem[]): string {
  const headers = [
    'Status',
    'Type',
    'Client',
    'Property address',
    'City',
    'Close date',
    'Volume',
    'GCI',
    'Company dollar',
    'Your commission',
    'Referral amount',
    'Split %',
    'Source',
    'Transaction coordinator',
    'Lender',
    'Title company',
    'Payment received',
    'DA uploaded',
    'Assigned leader',
    'Workspace',
    'Notes',
    'Created at',
    'Updated at',
  ];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(
      [
        STATUS_LABEL[row.status],
        TYPE_LABEL[row.transactionType],
        row.clientName,
        row.propertyAddress,
        row.city,
        row.closeDate ?? '',
        row.volume,
        row.gci,
        row.companyDollar,
        row.agentCommission,
        row.referralAmount ?? '',
        row.commissionSplit ?? '',
        row.source ? SOURCE_LABEL[row.source] : '',
        row.transactionCoordinator ?? '',
        row.lender ?? '',
        row.titleCompany ?? '',
        row.paymentReceived ? 'Yes' : 'No',
        row.daUploaded ? 'Yes' : 'No',
        row.assignedLeaderName ?? '',
        row.workspaceName,
        row.notes ?? '',
        row.createdAt,
        row.updatedAt,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}

function downloadCsv(rows: TransactionItem[], year: number) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions-${year}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Tile({ label, value, foot }: { label: string; value: React.ReactNode; foot?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-white px-4 py-3.5">
      <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">{label}</p>
      <p className="mt-1 truncate text-lg font-bold tracking-tight text-gray-900">{value}</p>
      {foot && <p className="mt-1 text-[11px] text-gray-500">{foot}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">{label}</dt>
      <dd className="truncate text-[13px] text-gray-700">{value ?? <Blank />}</dd>
    </div>
  );
}

function Row({ row }: { row: TransactionItem }) {
  const [open, setOpen] = useState(false);
  const closed = row.status === 'closed';

  return (
    <>
      <tr
        className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TINT[row.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {STATUS_LABEL[row.status]}
          </span>
        </td>
        <td className="px-3 py-2.5 text-gray-600">{TYPE_LABEL[row.transactionType]}</td>
        <td className="px-3 py-2.5 font-medium text-gray-900">{row.clientName}</td>
        <td className="max-w-[220px] truncate px-3 py-2.5 text-gray-600">
          {row.propertyAddress}
          {row.city ? `, ${row.city}` : ''}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
          {fmtDate(row.closeDate) ?? <Blank />}
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap text-gray-600 tabular-nums">
          {moneyShort(row.volume)}
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap text-gray-600 tabular-nums">
          {moneyShort(row.gci)}
        </td>
        <td
          className={`px-3 py-2.5 text-right whitespace-nowrap tabular-nums ${closed ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
        >
          {money(row.agentCommission)}
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap text-gray-500 tabular-nums">
          {row.commissionSplit !== null ? `${row.commissionSplit}%` : <Blank />}
        </td>
        <td className="px-2 py-2.5 text-gray-300">
          <ChevronDown
            size={14}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </td>
      </tr>

      {open && (
        <tr className="border-t border-gray-100 bg-gray-50/60">
          <td colSpan={COLUMNS.length} className="px-3 py-3">
            <dl className="grid gap-x-6 gap-y-2 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
              <Field label="Source" value={row.source ? SOURCE_LABEL[row.source] : null} />
              <Field label="Company dollar" value={money(row.companyDollar)} />
              <Field
                label="Referral amount"
                value={row.referralAmount !== null ? money(row.referralAmount) : null}
              />
              <Field label="Transaction coordinator" value={row.transactionCoordinator} />
              <Field label="Lender" value={row.lender} />
              <Field label="Title company" value={row.titleCompany} />
              <Field label="Payment received" value={row.paymentReceived ? 'Yes' : 'No'} />
              <Field label="DA uploaded" value={row.daUploaded ? 'Yes' : 'No'} />
              <Field label="Record came from" value={IMPORT_LABEL[row.importSource]} />
              <Field label="Manual override" value={row.isManualOverride ? 'Yes' : 'No'} />
              <Field label="Last updated" value={fmtDate(row.updatedAt)} />
              <Field label="Notes" value={row.notes} />
            </dl>
            {row.duplicateStatus === 'suspected_duplicate' && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                <CircleAlert size={12} strokeWidth={2} />
                Possible duplicate. Your office will review it.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <span className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          <span className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
          <span className="h-4 w-24 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyLedger({ year }: { year: number }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-6 py-12 text-center">
      <Inbox size={22} className="mx-auto mb-3 text-gray-300" strokeWidth={1.6} />
      <p className="text-sm font-semibold text-gray-700">No transactions in {year}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
        Your closings appear here once your office records them.
      </p>
    </div>
  );
}

function FailedLedger({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-white px-6 py-10 text-center">
      <AlertTriangle size={22} className="mx-auto mb-3 text-rose-400" strokeWidth={1.7} />
      <p className="text-sm font-semibold text-gray-800">Could not load your transactions</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
        Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        <RefreshCw size={13} strokeWidth={2} />
        Try again
      </button>
    </div>
  );
}

export function TransactionsView({
  initial,
  year,
}: {
  initial: TransactionsListResponse | null;
  year: number;
}) {
  const [response, setResponse] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (loading) return;
    setLoading(true);
    const result = await fetchYearTransactions(year, apiClientGet);
    // A failed refresh keeps whatever loaded before it rather than wiping a
    // working table because of one dropped request.
    if (result) setResponse(result);
    setLoading(false);
  }

  const feed = response ? deriveFeed(response.items) : null;

  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 sm:px-6 sm:pt-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Transact</h1>
          <p className="mt-1 text-sm text-gray-500">Your transactions and production for {year}.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={13} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <Lock size={15} className="mt-0.5 flex-none text-gray-500" strokeWidth={1.9} />
          <p className="text-xs leading-relaxed text-gray-600">
            Your office records your production. Ask your leader if anything looks wrong.
          </p>
        </div>

        {feed && (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(168px,1fr))]">
            <Tile label="Units closed" value={feed.summary.units} foot={`Closed in ${year}`} />
            <Tile
              label="Volume"
              value={moneyShort(feed.summary.volume)}
              foot="Closed year to date"
            />
            <Tile
              label="GCI"
              value={moneyShort(feed.summary.gci)}
              foot={`${moneyShort(feed.summary.companyDollar)} company dollar`}
            />
            <Tile
              label="Your commission"
              value={money(feed.summary.agentCommission)}
              foot="Closed year to date"
            />
            <Tile
              label="In the pipeline"
              value={feed.pipeline.count}
              foot={`${moneyShort(feed.pipeline.projectedCommission)} projected`}
            />
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
            <h2 className="text-sm font-bold tracking-tight text-gray-900">
              Your transactions
              {feed && feed.rows.length > 0 && (
                <span className="ml-2 font-normal text-gray-400">{feed.rows.length} records</span>
              )}
            </h2>
            {feed && feed.rows.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCsv(feed.rows, year)}
                className="flex flex-none items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                <Download size={13} strokeWidth={2.2} />
                Export CSV
              </button>
            )}
          </div>
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            {loading && !response ? (
              <Skeleton />
            ) : !feed ? (
              <FailedLedger onRetry={refresh} />
            ) : feed.rows.length === 0 ? (
              <EmptyLedger year={year} />
            ) : (
              <>
                <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-gray-100">
                  <table className="w-full min-w-[840px] bg-white text-[13px]">
                    <thead>
                      <tr className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                        {COLUMNS.map((column, i) => (
                          <th
                            key={column || `end-${i}`}
                            className={`px-3 py-2.5 ${i >= 5 && i <= 8 ? 'text-right' : 'text-left'}`}
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {feed.rows.map((row) => (
                        <Row key={row.id} row={row} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11px] text-gray-400">Open a row for the full record.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
