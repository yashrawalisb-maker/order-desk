import { CAT, RETAILERS } from '../data/seed';
import { rs, unitStr } from '../lib/money';
import { fmtDate, invState, invTotal } from '../lib/receivables';
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
  const steps = [
    { label: 'Invoice raised in Tally', when: fmtDate(inv.issued), done: true },
    { label: 'Razorpay link sent on WhatsApp', when: inv.reminders ? `${inv.reminders} reminder${inv.reminders > 1 ? 's' : ''} since` : fmtDate(inv.issued), done: true },
    { label: inv.paidOn ? 'Paid through the link' : st.status === 'late' ? `Unpaid, ${st.days} days past ${r.terms}-day terms` : `Due ${fmtDate(st.dueOn)}`, when: inv.paidOn ? fmtDate(inv.paidOn) : '', done: !!inv.paidOn },
  ];

  return (
    <Frame
      bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back" /><Title h={inv.no} sub={r.name} /></>}
      bottom={inv.paidOn ? undefined : (
        <div className="actionbar">
          <button className="btn" onClick={() => dispatch({ type: 'remind', no: inv.no })}>{I.bell()} Remind</button>
          <button className="btn primary" style={{ flex: 1 }} onClick={() => dispatch({ type: 'paid', no: inv.no })}>Simulate payment received</button>
        </div>
      )}
    >
      <div className="okhead">
        <p className="k-label">Invoice total</p>
        <h2 className="hero-amt">{rs(invTotal(inv))}</h2>
        <p><PayChip st={st} /></p>
      </div>

      <section className="card">
        <h2>Payment</h2>
        <ol className="timeline">
          {steps.map((s, i) => (
            <li key={i} className={s.done ? 'done' : st.status === 'late' ? 'late' : ''}>
              <span className="dot" aria-hidden="true">{s.done ? I.ok() : null}</span>
              <span><b>{s.label}</b>{s.when && <small>{s.when}</small>}</span>
            </li>
          ))}
        </ol>
        <div className="paylink" style={{ marginTop: 10 }}>{I.link()}<span>{inv.payLink}<small>UPI, cards and netbanking. Reconciles to {inv.no} in Tally automatically.</small></span></div>
        {!inv.paidOn && <p className="hint">Demo: in the live product Razorpay confirms the payment on its own. Use the button below to simulate it.</p>}
      </section>

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
