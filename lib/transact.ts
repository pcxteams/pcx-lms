/**
 * Types and label maps for `GET /transactions`, mirroring
 * `pcx-api-v2/src/transaction/transaction.service.ts` (`TransactionsListItem`,
 * `TransactionsListResponse`) and the enums in `transaction.entity.ts`. An
 * Agent's session resolves to `mode: 'own'` server-side, so this endpoint
 * already returns just their rows with `canWrite: false` — nothing here
 * re-implements that scoping.
 */

export const TRANSACTION_STATUSES = [
  'pending',
  'signed_client',
  'active',
  'closed',
  'canceled',
  'appointment_held',
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_TYPES = ['buyer', 'listing', 'rental_lease', 'referral'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_SOURCES = [
  'referral',
  'zillow',
  'open_house',
  'facebook_ads',
  'past_client',
  'website',
  'walk_in',
  'cold_call',
  'agent_referral',
] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export type TransactionImportSource = 'manual' | 'api' | 'csv' | 'ai';

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'Pending',
  signed_client: 'Signed client',
  active: 'Under contract',
  closed: 'Closed',
  canceled: 'Canceled',
  appointment_held: 'Appointment held',
};

export const TYPE_LABEL: Record<TransactionType, string> = {
  buyer: 'Buyer',
  listing: 'Listing',
  rental_lease: 'Rental / lease',
  referral: 'Referral',
};

export const SOURCE_LABEL: Record<TransactionSource, string> = {
  referral: 'Referral',
  zillow: 'Zillow',
  open_house: 'Open house',
  facebook_ads: 'Facebook ads',
  past_client: 'Past client',
  website: 'Website',
  walk_in: 'Walk-in',
  cold_call: 'Cold call',
  agent_referral: 'Agent referral',
};

export const IMPORT_LABEL: Record<TransactionImportSource, string> = {
  manual: 'Entered by the office',
  api: 'Provider API',
  csv: 'CSV upload',
  ai: 'Email / PDF intake',
};

/** One row as the API projects it — a subset of the 27 stored columns, the
 *  rest joined in for display (agent/leader/workspace names). */
export interface TransactionItem {
  id: string;
  agentUserId: string;
  agentName: string;
  status: TransactionStatus;
  clientName: string;
  propertyAddress: string;
  city: string;
  transactionType: TransactionType;
  source: TransactionSource | null;
  closeDate: string | null;
  daysToClose: number | null;
  volume: number;
  gci: number;
  companyDollar: number;
  agentCommission: number;
  referralAmount: number | null;
  commissionSplit: number | null;
  transactionCoordinator: string | null;
  lender: string | null;
  titleCompany: string | null;
  paymentReceived: boolean;
  daUploaded: boolean;
  assignedLeaderUserId: string | null;
  assignedLeaderName: string | null;
  teamName: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'office' | 'team';
  officeId: string | null;
  officeName: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  notes: string | null;
  duplicateStatus: 'clear' | 'suspected_duplicate' | 'resolved';
  importSource: TransactionImportSource;
  isManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsListResponse {
  items: TransactionItem[];
  total: number;
  page: number;
  perPage: number;
  summary: { units: number; volume: number; gci: number; companyDollar: number };
  canWrite: boolean;
}

export interface ProductionSummary {
  units: number;
  volume: number;
  gci: number;
  companyDollar: number;
  agentCommission: number;
}

export interface TransactFeed {
  rows: TransactionItem[];
  summary: ProductionSummary;
  pipeline: { count: number; projectedCommission: number };
}

const OPEN_STATUSES: TransactionStatus[] = [
  'pending',
  'signed_client',
  'active',
  'appointment_held',
];

/**
 * The API's own `summary` totals every row matching the filters regardless of
 * status, and has no `agentCommission` sum — neither fits a page that needs
 * "closed to date" separate from "still in the pipeline". So this re-derives
 * both from the fetched rows, the same split `pcx-agent-home-mock`'s
 * `transactionFeed` makes between `closedRows` and `pipelineRows`.
 */
export function deriveFeed(items: TransactionItem[]): TransactFeed {
  const closed = items.filter((item) => item.status === 'closed');
  const pipeline = items.filter((item) => OPEN_STATUSES.includes(item.status));

  const sum = (rows: TransactionItem[], pick: (row: TransactionItem) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

  return {
    rows: items,
    summary: {
      units: closed.length,
      volume: sum(closed, (r) => r.volume),
      gci: sum(closed, (r) => r.gci),
      companyDollar: sum(closed, (r) => r.companyDollar),
      agentCommission: sum(closed, (r) => r.agentCommission),
    },
    pipeline: {
      count: pipeline.length,
      projectedCommission: sum(pipeline, (r) => r.agentCommission),
    },
  };
}

/**
 * Every transaction the caller can see for the given calendar year (by close
 * date, or created date for a deal still open — same COALESCE the API filters
 * on), following pagination until the full set is in hand. `perPage` is
 * capped at 200 server-side, so one agent-year rarely needs more than a
 * single round trip; the loop just means a busy one doesn't silently lose
 * rows past the first page.
 */
export async function fetchYearTransactions(
  year: number,
  getter: (path: string) => Promise<TransactionsListResponse | null>
): Promise<TransactionsListResponse | null> {
  const dateStart = `${year}-01-01`;
  const dateEnd = `${year}-12-31`;
  const perPage = 200;
  const maxPages = 10;

  let page = 1;
  let items: TransactionItem[] = [];
  let latest: TransactionsListResponse | null = null;

  for (;;) {
    const res = await getter(
      `/transactions?dateStart=${dateStart}&dateEnd=${dateEnd}&perPage=${perPage}&page=${page}`
    );
    if (!res) return latest ? { ...latest, items } : null;
    latest = res;
    items = items.concat(res.items);
    if (items.length >= res.total || res.items.length === 0 || page >= maxPages) break;
    page += 1;
  }

  return { ...latest, items };
}
