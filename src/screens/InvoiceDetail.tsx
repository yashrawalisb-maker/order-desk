import { CAT, RETAILERS } from '../data/seed';
import { rs, unitStr } from '../lib/money';
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
        <p className="k-label">Invoice total</p>
        <h2 className="hero-amt">{rs(invTotal(inv))}</h2>
        {!inv.paidOn && pays.length > 0 && <p className="muted" style={{ margin: '-4px 0 8px' }}>{rs(remaining)} still due</p>}
        <p><PayChip st={st} /></p>
      </div>

      <section className="card">
        <h2>Payment</h2>
        <ol className="timeline">
          {steps.map((s) => (
            <li key={s.key} className={s.done ? 'done' : st.status === 'late' ? 'late' : ''}>
              <span className="dot" aria-hidden="true">{s.done ? I.ok() : null}</span>
              <span><b>{s.label}</b>{s.when && <small>{s.when}</small>}</span>
            </li>
          ))}
        </ol>
        <div className="paylink" style={{ marginTop: 10 }}>{I.link()}<span>{inv.payLink}<small>UPI, cards and netbanking. Reconciles to {inv.no} in Tally automatically.</small></span></div>
        {!inv.paidOn && <p className="hint">In the live product Razorpay confirms payments on its own. Here, use the button below to simulate one.</p>}
      </section>

      {st.status === 'late' && (
        <section className="card">
          <h2>{inv.handedOff ? `With Razorpay’s recovery agent since ${fmtShort(inv.handedOff)}` : 'Recovery'}</h2>
          <p className="muted">{inv.handedOff ? 'It received the invoice, the payment link and:' : 'Order Desk doesn’t chase. Hand this to Razorpay’s recovery agent with:'}</p>
          <ul className="pack">{handoffPack(S, inv).map((x, i) => <li key={i}>{x}</li>)}</ul>
          <p className="hint">Simulated in this prototype.</p>
        </section>
      )}

      <section className="card">
        <h2>Documents</h2>
        <div className="acts">
          <button className="btn small" onClick={() => dispatch({ type: 'doc', doc: { kind: 'invoice', invoice: inv.no } })}>{I.doc()} Tax invoice</button>
          <button className="btn small" onClick={() => dispatch({ type: 'doc', doc: { kind: 'po', invoice: inv.no } })}>{I.doc()} Purchase order</button>
          {order && <button className="btn small" onClick={() => dispatch({ type: 'open', id: order.id })}>Original order</button>}
        </div>
      </section>

      <section className="card">
        <h2>{inv.po}</h2>
        <table className="inv">
          <tbody>
            {inv.lines.map((l, i) => {
              const c = CAT[l.sku];
              return <tr key={i}><td>{c.short} × {l.qty} {unitStr(c.unit, l.qty)}</td><td>{rs(l.rate * l.qty)}</td></tr>;
            })}
            <tr className="tot"><td>Total</td><td>{rs(invTotal(inv))}</td></tr>
          </tbody>
        </table>
      </section>

      <button className="linkbtn" style={{ marginTop: 12 }} onClick={() => dispatch({ type: 'go', view: { name: 'retailer', id: inv.retailer } })}>See {r.name}’s history</button>
    </Frame>
  );
}
