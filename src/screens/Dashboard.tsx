import { useState } from 'react';
import { RETAILERS } from '../data/seed';
import { rs, total } from '../lib/money';
import { BUCKETS, bucketOf, invState, receivables, today, type BucketId } from '../lib/receivables';
import { overdueCases } from '../lib/overdue';
import { OverdueCard } from '../components/OverdueCard';
import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';
import { InvoiceRow } from '../components/InvoiceRow';
import { I, chIcon } from '../components/icons';

type Filter = 'all' | 'today' | 'unpaid' | 'late' | 'paid' | 'closed' | BucketId;
const FILTERS: [Filter, string][] = [['all', 'All'], ['unpaid', 'Unpaid'], ['late', 'Late'], ['paid', 'Paid'], ['closed', 'Not invoiced']];
const BAR_TONE: Record<BucketId, string> = { current: 'brand', b1: 'amber', b2: 'amber', b3: 'red' };
const CLOSED = ['held', 'stopped', 'handled'];

export function Dashboard({ S, dispatch }: ScreenProps) {
  const [filter, setFilter] = useState<Filter>(S.view.id === 'today' ? 'today' : 'all');
  const [q, setQ] = useState('');
  const R = receivables(S.invoices);
  const cases = overdueCases(S);
  const max = Math.max(1, ...BUCKETS.map((b) => R.aging[b.id].amount));
  const needle = q.trim().toLowerCase();
  const match = (...xs: string[]) => !needle || xs.some((x) => x.toLowerCase().includes(needle));

  const invoices = filter === 'closed' ? [] : S.invoices
    .map((inv) => ({ inv, st: invState(inv) }))
    .filter(({ inv, st }) =>
      filter === 'all' ? true
      : filter === 'today' ? inv.issued === today()
      : filter === 'unpaid' ? st.status !== 'paid'
      : filter === 'late' ? st.status === 'late'
      : filter === 'paid' ? st.status === 'paid'
      : bucketOf(st) === filter)
    .filter(({ inv }) => match(RETAILERS[inv.retailer].name, RETAILERS[inv.retailer].owner, inv.no, inv.po))
    // Late first (oldest first), then due soonest, then paid newest
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.st.status === 'late' ? 0 : x.st.status === 'due' ? 1 : 2);
      return rank(a) - rank(b) || (a.st.status === 'late' ? b.st.days - a.st.days : a.st.status === 'due' ? a.st.days - b.st.days : b.inv.issued.localeCompare(a.inv.issued));
    });
  const closed = filter === 'closed' || filter === 'today' || (filter === 'all' && needle)
    ? S.orders.filter((o) => CLOSED.includes(o.status) && match(RETAILERS[o.retailer].name, RETAILERS[o.retailer].owner, o.raw))
    : [];
  const bucketLabel = BUCKETS.find((b) => b.id === filter)?.label;

  return (
    <Frame bar={<Title h="Money" sub={`${rs(R.outstanding)} outstanding across ${R.outCount} invoices`} />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      <div className="kpis">
        <div className="kpi"><span className="k-label">Overdue</span><span className="k-val">{rs(R.overdue)}</span></div>
        <div className="kpi"><span className="k-label">Recovered, 7 days</span><span className="k-val">{rs(R.recovered7)}</span></div>
      </div>

      {cases.length > 0 && (
        <>
          <div className="pohead"><h2>Overdue</h2><span>{cases.length}</span></div>
          {cases.map((c) => <OverdueCard key={c.inv.no} c={c} dispatch={dispatch} />)}
        </>
      )}

      <section className="card" aria-labelledby="aging-h">
        <h2 id="aging-h">Unpaid by age</h2>
        <div className="bars">
          {BUCKETS.map((b) => {
            const v = R.aging[b.id];
            return (
              <button key={b.id} className={`bar-row ${filter === b.id ? 'on' : ''}`} aria-pressed={filter === b.id}
                onClick={() => setFilter(filter === b.id ? 'all' : b.id)}
                aria-label={`${b.label}: ${rs(v.amount)}, ${v.count} invoice${v.count === 1 ? '' : 's'}`}>
                <span className="bar-label">{b.label}</span>
                <span className="bar-track"><span className={`bar-fill ${BAR_TONE[b.id]}`} style={{ width: v.amount ? `${Math.max(2, (v.amount / max) * 100)}%` : 0 }} /></span>
                <span className="bar-val">{v.amount ? rs(v.amount) : '–'}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="pohead"><h2>{filter === 'today' ? 'Today' : 'All invoices'}</h2><span>{invoices.length + closed.length}</span></div>
      <label className="searchbox">
        {I.search()}
        <span className="sr">Search</span>
        <input type="search" placeholder="Retailer, PO or invoice" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="seg filters" role="group" aria-label="Filter invoices">
        {FILTERS.map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        {(bucketLabel || filter === 'today') && <button aria-pressed onClick={() => setFilter('all')}>{bucketLabel ?? 'Today'} ×</button>}
      </div>
      {invoices.map(({ inv }) => <InvoiceRow key={inv.no} inv={inv} dispatch={dispatch} />)}
      {closed.map((o) => (
        <button key={o.id} className="row-card" onClick={() => dispatch({ type: 'open', id: o.id })}>
          <span className="ch">{chIcon(o.channel)}</span>
          <span className="rc-main">
            <span className="rc-title">{RETAILERS[o.retailer].name}</span>
            <span className="rc-sub">Today, {o.at}{o.lines.length ? ` · ${rs(total(o))}` : ''}</span>
          </span>
          <span className="rc-side"><span className="chip">{o.status === 'held' ? 'On hold' : o.status === 'handled' ? 'Handled by hand' : 'Stopped'}</span></span>
        </button>
      ))}
      {!invoices.length && !closed.length && <div className="empty">Nothing here{needle ? ` for “${q}”` : ''}.</div>}
    </Frame>
  );
}
