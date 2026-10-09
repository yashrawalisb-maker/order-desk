import { isOpen, rs, unitStr } from '../lib/money';
import { perWeekLabel, profileOf } from '../lib/profile';
import { fmtShort } from '../lib/receivables';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { InvoiceRow } from '../components/InvoiceRow';
import { chIcon } from '../components/icons';

const RISK_TONE = { good: 'green', watch: 'amber', hold: 'red' } as const;

export function RetailerDetail({ S, dispatch, id }: ScreenProps & { id: string }) {
  const p = profileOf(S, id);
  const { r, ordering: ord, payment: pay } = p;

  return (
    <Frame bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back" /><Title h={r.name} sub={`${r.owner} · ${r.area} · GSTIN ${r.gstin}`} /></>}>
      <div className={`risk ${RISK_TONE[p.risk.level]}`}>
        <b>{p.risk.label}</b>
        <span>{p.risk.why}</span>
      </div>

      <section className="card">
        <h2>Ordering pattern</h2>
        <dl className="facts plain">
          <dt>How often</dt><dd>{perWeekLabel(ord.perWeek)} <span className="muted-s">({r.history.orders8w} in 8 weeks)</span></dd>
          <dt>Typical order</dt><dd>{ord.avgOrder ? rs(ord.avgOrder) : 'No orders yet'}</dd>
          <dt>Sends orders as</dt>
          <dd>{ord.channelMix.map((c) => `${c.label} ${c.pct}%`).join(', ')}</dd>
        </dl>
        {ord.basket.length > 0 ? (
          <>
            <h3 className="sub-h">Usual basket</h3>
            <table className="inv">
              <tbody>
                {ord.basket.map((b) => (
                  <tr key={b.sku}><td>{b.item.short}</td><td>{b.lo === b.hi ? b.lo : `${b.lo}–${b.hi}`} {unitStr(b.item.unit, b.hi)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        ) : <p className="muted" style={{ marginTop: 8 }}>No usual basket yet: too few readable orders.</p>}
      </section>

      <section className="card">
        <h2>Payment cycle</h2>
        <dl className="facts plain">
          <dt>Pays in</dt><dd>About {pay.avgDays} days on {pay.terms}-day terms</dd>
          <dt>On time</dt><dd>{pay.paidCount ? `${pay.onTime} of last ${pay.paidCount} paid within terms` : 'No payments in the ledger yet'}</dd>
          {pay.lastPaid && <><dt>Last payment</dt><dd>{pay.lastPaid.inv.no}, {fmtShort(pay.lastPaid.inv.paidOn!)}, in {pay.lastPaid.st.days} days</dd></>}
          <dt>Unpaid now</dt><dd>{pay.outstanding ? rs(pay.outstanding) : 'Nothing'}{pay.dues.amount ? `, ${rs(pay.dues.amount)} overdue` : ''}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>What the desk knows</h2>
        <p className="muted" style={{ marginTop: -4 }}>Collated from Rajesh’s decisions and {r.owner}’s payments.</p>
        {p.knows.length ? p.knows.map((g) => (
          <div key={g.id} className="knows">
            <h3 className="sub-h">{g.title}</h3>
            <ul>
              {g.items.map((x, i) => (
                <li key={i}>{x.t}<small>{x.at}{x.times > 1 ? ` · seen ${x.times} times` : ''}</small></li>
              ))}
            </ul>
          </div>
        )) : <p className="muted">Nothing yet. Every flag Rajesh acts on and every payment adds to this.</p>}
      </section>

      {p.todays.length > 0 && (
        <>
          <div className="pohead"><h2>Orders today</h2><span>{p.todays.length}</span></div>
          {p.todays.map((o) => (
            <button key={o.id} className="row-card" onClick={() => dispatch({ type: 'open', id: o.id })}>
              <span className="ch">{chIcon(o.channel)}</span>
              <span className="rc-main">
                <span className="rc-title">{o.at}</span>
                <span className="rc-sub">{o.raw.replace(/\n/g, ', ')}</span>
              </span>
              <span className="rc-side">
                <span className={`chip ${isOpen(o) ? 'blue' : o.status === 'approved' ? 'green' : ''}`}>
                  {o.status === 'draft' ? 'Draft ready' : o.status === 'human' ? 'Needs you' : o.status === 'approved' ? 'Invoiced' : o.status === 'held' ? 'On hold' : o.status === 'handled' ? 'Handled' : 'Stopped'}
                </span>
              </span>
            </button>
          ))}
        </>
      )}

      <div className="pohead"><h2>Invoices</h2><span>{p.invoices.length}</span></div>
      {p.invoices.length ? p.invoices.map((inv) => <InvoiceRow key={inv.no} inv={inv} dispatch={dispatch} showRetailer={false} />) : <div className="empty">No invoices yet.</div>}
    </Frame>
  );
}
