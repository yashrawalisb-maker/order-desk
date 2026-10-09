import { useState } from 'react';
import { rs } from '../lib/money';
import { BUCKETS, bucketOf, invState, receivables, type BucketId } from '../lib/receivables';
import { overdueCases } from '../lib/overdue';
import { OverdueCard } from '../components/OverdueCard';
import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';
import { InvoiceRow } from '../components/InvoiceRow';

type Filter = 'all' | 'unpaid' | 'late' | 'paid' | BucketId;
const FILTERS: [Filter, string][] = [['all', 'All'], ['unpaid', 'Unpaid'], ['late', 'Late'], ['paid', 'Paid']];
const BAR_TONE: Record<BucketId, string> = { current: 'brand', b1: 'amber', b2: 'amber', b3: 'red' };

function Receivables({ S, dispatch }: ScreenProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const R = receivables(S.invoices);
  const max = Math.max(1, ...BUCKETS.map((b) => R.aging[b.id].amount));

  const shown = S.invoices
    .map((inv) => ({ inv, st: invState(inv) }))
    .filter(({ st }) =>
      filter === 'all' ? true
      : filter === 'unpaid' ? st.status !== 'paid'
      : filter === 'late' ? st.status === 'late'
      : filter === 'paid' ? st.status === 'paid'
      : bucketOf(st) === filter)
    // Late first (oldest first), then due soonest, then paid newest
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.st.status === 'late' ? 0 : x.st.status === 'due' ? 1 : 2);
      return rank(a) - rank(b) || (a.st.status === 'late' ? b.st.days - a.st.days : a.st.status === 'due' ? a.st.days - b.st.days : b.inv.issued.localeCompare(a.inv.issued));
    });

  const cases = overdueCases(S);
  return (
    <>
      {cases.length > 0 && (
        <>
          <div className="pohead" style={{ marginTop: 0 }}><h2>Overdue</h2><span>{cases.length}</span></div>
          {cases.map((c) => <OverdueCard key={c.inv.no} c={c} dispatch={dispatch} />)}
        </>
      )}
      <div className="kpis" style={{ marginTop: cases.length ? 14 : 0 }}>
        <div className="kpi"><span className="k-label">Outstanding</span><span className="k-val">{rs(R.outstanding)}</span><span className="k-sub">{R.outCount} invoices unpaid</span></div>
        <div className="kpi"><span className="k-label">Overdue</span><span className="k-val">{rs(R.overdue)}</span><span className="k-sub">{R.overCount ? `${R.overCount} past 21-day terms` : 'Nothing late'}</span></div>
        <div className="kpi"><span className="k-label">Recovered from overdue, 7 days</span><span className="k-val">{rs(R.recovered7)}</span><span className="k-sub">{rs(R.collected7)} collected in all</span></div>
        <div className="kpi"><span className="k-label">Average days to pay</span><span className="k-val">{R.avgDays.toFixed(1)}</span><span className="k-sub">On 21-day terms</span></div>
      </div>

      <section className="card" aria-labelledby="aging-h">
        <h2 id="aging-h">Unpaid invoices by age <span className="muted-s">Tap a bar to filter</span></h2>
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

      <div className="pohead"><h2>Invoices</h2><span>{shown.length}</span></div>
      <div className="seg filters" role="group" aria-label="Filter invoices">
        {FILTERS.map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        {BUCKETS.some((b) => b.id === filter) && <button aria-pressed onClick={() => setFilter('all')}>{BUCKETS.find((b) => b.id === filter)!.label} ×</button>}
      </div>
      {shown.length ? shown.map(({ inv }) => <InvoiceRow key={inv.no} inv={inv} dispatch={dispatch} />) : <div className="empty">No invoices here.</div>}
    </>
  );
}

export function Dashboard(props: ScreenProps) {
  const { S, dispatch } = props;
  return (
    <Frame bar={<Title h="Dashboard" sub="Receivables: what’s owed and what came in" />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      <Receivables {...props} />
    </Frame>
  );
}
