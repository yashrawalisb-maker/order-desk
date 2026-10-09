import { RETAILERS } from '../data/seed';
import { rs } from '../lib/money';
import { fmtDate, fmtShort, invPayments, invRemaining, invState, invTotal } from '../lib/receivables';
import { handoffPack } from '../lib/overdue';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { PayChip } from '../components/InvoiceRow';
import { I } from '../components/icons';

export function InvoiceDetail({ S, dispatch, no }: ScreenProps & { no: string }) {
  const inv = S.invoices.find((x) => x.no === no);
  if (!inv) {
    return (
      <Frame bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back" /><Title h={no} sub="Not found" /></>}>
        <div className="empty">This invoice isn’t in the ledger.</div>
      </Frame>
    );
  }
  const r = RETAILERS[inv.retailer];
  const st = invState(inv);
  const order = inv.orderId ? S.orders.find((o) => o.id === inv.orderId) : undefined;
  const remaining = invRemaining(inv);
  const sent = inv.request?.kind === 'partial' ? inv.request : null;
  const req = sent && !sent.fulfilledOn ? sent : null;
  const held = S.orders.find((x) => x.release?.invoice === inv.no && x.status === 'held');
  const pays = invPayments(inv);
  const steps = [
    { label: 'Invoice raised in Tally', when: fmtDate(inv.issued), done: true, key: 'raised' },
    { label: 'Razorpay link sent on WhatsApp', when: fmtDate(inv.issued), done: true, key: 'link' },
    ...(sent ? [{ label: `Part-payment link for ${rs(sent.amount!)} sent${held || sent.fulfilledOn ? ' to release his new order' : ''}`, when: fmtDate(sent.sentOn), done: true, key: 'req' }] : []),
    ...pays.map((p, i) => ({ label: `${rs(p.amount)} received through the link`, when: fmtDate(p.on), done: true, key: 'pay' + i })),
    ...(inv.handedOff ? [{ label: 'Handed to Razorpay’s recovery agent', when: fmtDate(inv.handedOff), done: true, key: 'hand' }] : []),
    ...(inv.paidOn ? [] : [{ label: st.status === 'late' ? `${rs(remaining)} unpaid, ${st.days} days past ${r.terms}-day terms` : `${rs(remaining)} due ${fmtDate(st.dueOn)}`, when: '', done: false, key: 'open' }]),
  ];

  return (
    <Frame
      bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back" /><Title h={inv.no} sub={r.name} /></>}
      bottom={inv.paidOn ? undefined : (
        <div className="actionbar">
          {st.status === 'late' && !inv.handedOff && <button className="btn" onClick={() => dispatch({ type: 'handoff', no: inv.no })}>Hand off</button>}
          <button className="btn primary" style={{ flex: 1 }} onClick={() => dispatch({ type: 'paid', no: inv.no })}>{req ? `Simulate ${rs(Math.min(req.amount!, remaining))} received` : 'Simulate payment received'}</button>
        </div>
      )}
    >
      <div className="okhead">
        <h2 className="hero-amt">{rs(invTotal(inv))}</h2>
        {!inv.paidOn && pays.length > 0 && <p className="muted" style={{ margin: '-4px 0 8px' }}>{rs(remaining)} still due</p>}
        <p><PayChip st={st} /></p>
      </div>

      <section className="card">
        <ol className="timeline">
          {steps.map((s) => (
            <li key={s.key} className={s.done ? 'done' : st.status === 'late' ? 'late' : ''}>
              <span className="dot" aria-hidden="true">{s.done ? I.ok() : null}</span>
              <span><b>{s.label}</b>{s.when && <small>{s.when}</small>}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="card rows">
        <button className="row" onClick={() => dispatch({ type: 'doc', doc: { kind: 'invoice', invoice: inv.no } })}>
          <span className="ic-box">{I.doc()}</span>
          <span className="row-main"><b>Tax invoice</b><small>{inv.lines.length} items</small></span>
          <span className="row-go" aria-hidden="true">›</span>
        </button>
        <button className="row" onClick={() => dispatch({ type: 'doc', doc: { kind: 'po', invoice: inv.no } })}>
          <span className="ic-box">{I.doc()}</span>
          <span className="row-main"><b>Purchase order</b><small>{inv.po}</small></span>
          <span className="row-go" aria-hidden="true">›</span>
        </button>
        <div className="row">
          <span className="ic-box brand">{I.link()}</span>
          <span className="row-main"><b>Razorpay payment link</b><small>{inv.payLink}</small></span>
          {!inv.paidOn && <span className="chip">Demo</span>}
        </div>
        {order && (
          <button className="row" onClick={() => dispatch({ type: 'open', id: order.id })}>
            <span className="ic-box">{I.text()}</span>
            <span className="row-main"><b>Original order</b><small>What {r.owner} sent</small></span>
            <span className="row-go" aria-hidden="true">›</span>
          </button>
        )}
        <button className="row" onClick={() => dispatch({ type: 'go', view: { name: 'retailer', id: inv.retailer } })}>
          <span className="ic-box">{I.shop()}</span>
          <span className="row-main"><b>{r.name}</b><small>Retailer profile</small></span>
          <span className="row-go" aria-hidden="true">›</span>
        </button>
      </div>

      {st.status === 'late' && (
        <details className="card handoff">
          <summary>{inv.handedOff ? `With Razorpay’s recovery agent since ${fmtShort(inv.handedOff)}` : 'Chasing: Razorpay’s recovery agent'}</summary>
          <ul>{handoffPack(S, inv).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </details>
      )}
    </Frame>
  );
}
