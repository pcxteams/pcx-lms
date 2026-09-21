import { apiGet } from '@/lib/api';
import { fetchYearTransactions } from '@/lib/transact';
import { TransactionsView } from './_components/transactions-view';

/**
 * The agent's own production, on PCx's canonical 27-field transaction
 * schema — the only variation of the mock's Transact page backed by a real
 * table and a shipped, role-aware API today (leads/clients/activity/KPIs are
 * still schema-less speculation and are deliberately left out).
 *
 * Scoped to the current calendar year: the API enforces no such window on
 * its own, but an unbounded "all of an agent's history" ledger has no
 * natural stopping point, and "closed year to date" is the framing the mock
 * itself uses for this page.
 */
export default async function TransactPage() {
  const year = new Date().getFullYear();
  const initial = await fetchYearTransactions(year, apiGet);

  return <TransactionsView initial={initial} year={year} />;
}
