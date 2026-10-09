import { useState } from 'react';
import { RETAILERS } from '../data/seed';
import { rs } from '../lib/money';
import { BUCKETS, bucketOf, duesOf, invState, invTotal, receivables, type BucketId } from '../lib/receivables';
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

  return (
    <>
      <div className="kpis">
        <div className="kpi"><span className="k-label">Outstanding</span><span className="k-val">{rs(R.outstanding)}</span><span className="k-sub">{R.outCount} invoices unpaid</span></div>
        <div className="kpi"><span className="k-label">Overdue</span><span className="k-val">{rs(R.overdue)}</span><span className="k-sub">{R.overCount ? `${R.overCount} past 21-day terms` : 'Nothing late'}</span></div>
        <div className="kpi"><span className="k-label">Collected, last 7 days</span><span className="k-val">{rs(R.collected7)}</span><span className="k-sub">Through Razorpay links</span></div>
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

function Retailers({ S, dispatch }: ScreenProps) {
  const rows = Object.values(RETAILERS).map((r) => {
    const mine = S.invoices.filter((i) => i.retailer === r.id);
    const unpaid = mine.filter((i) => !i.paidOn).reduce((a, i) => a + invTotal(i), 0);
    const dues = duesOf(S.invoices, r.id);
    const openOrders = S.orders.filter((o) => o.retailer === r.id && (o.status === 'draft' || o.status === 'human')).length;
    return { r, unpaid, dues, count: mine.length, openOrders };
  }).sort((a, b) => b.dues.amount - a.dues.amount || b.unpaid - a.unpaid);

  return (
    <>
      <p className="intro">What’s normal for each retailer: the history every new order is checked against.</p>
      {rows.map(({ r, unpaid, dues, count, openOrders }) => (
        <button key={r.id} className="row-card" onClick={() => dispatch({ type: 'go', view: { name: 'retailer', id: r.id } })}>
          <span className="rc-main">
            <span className="rc-title">{r.name}</span>
            <span className="rc-sub">{r.owner} · {r.area} · pays in about {r.avgPay} days</span>
            <span className="chips" style={{ marginTop: 6 }}>
              {dues.amount > 0 && <span className="chip red">{rs(dues.amount)} overdue</span>}
              {openOrders > 0 && <span className="chip blue">{openOrders} order{openOrders > 1 ? 's' : ''} need you</span>}
              <span className="chip">{count} invoice{count === 1 ? '' : 's'}</span>
            </span>
          </span>
          <span className="rc-side">
            <span className="rc-amt">{unpaid ? rs(unpaid) : 'No dues'}</span>
            {unpaid > 0 && <span className="rc-note">unpaid</span>}
          </span>
        </button>
      ))}
    </>
  );
}

export function Dashboard(props: ScreenProps) {
  const { S, dispatch } = props;
  return (
    <Frame bar={<Title h="Dashboard" sub="Receivables and retailers" />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      <div className="seg tabs2" role="group" aria-label="Dashboard view">
        <button aria-pressed={S.dashTab === 'receivables'} onClick={() => dispatch({ type: 'dashTab', v: 'receivables' })}>Receivables</button>
        <button aria-pressed={S.dashTab === 'retailers'} onClick={() => dispatch({ type: 'dashTab', v: 'retailers' })}>Retailers</button>
      </div>
      {S.dashTab === 'receivables' ? <Receivables {...props} /> : <Retailers {...props} />}
    </Frame>
  );
}
