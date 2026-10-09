import { CAT, RETAILERS } from '../data/seed';
import { amt, rs, total, unitStr } from '../lib/money';
import type { Order } from '../types';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { I } from '../components/icons';

export function echoText(o: Order): string {
  const r = RETAILERS[o.retailer];
  const items = o.lines.map((l) => `• ${CAT[l.sku!].short} × ${l.qty} ${unitStr(CAT[l.sku!].unit, l.qty)}`).join('\n');
  const ask = o.gap && o.gap.ask ? `\n${CAT[o.gap.sku].short} bhi bhejein? It’s usually in your weekly order.` : '';
  return `Namaste ${r.owner} ji. Your order with Gupta Distributors:\n${items}\nTotal ${rs(total(o))}. Pay here: ${o.payLink}${ask}\nAnything wrong? Reply before 4 pm dispatch.`;
}

export function Approved({ dispatch, o }: ScreenProps & { o: Order }) {
  const r = RETAILERS[o.retailer];
  return (
    <Frame
      bar={<><BackButton onClick={() => dispatch({ type: 'open', id: o.id })} label="Back to draft" /><Title h="PO approved" sub={r.name} /></>}
      bottom={<div className="actionbar"><button className="btn primary wide" onClick={() => dispatch({ type: 'send' })}>Send invoice and link</button></div>}
    >
      <div className="okhead">
        <div className="okmark">{I.okBig()}</div>
        <h2>{o.poNo}</h2>
        <p>Invoice {o.invNo} raised in Tally from the approved PO</p>
      </div>
      <div className="card">
        <h3>Invoice <span className="chip green">Synced to Tally</span></h3>
        <table className="inv">
          <tbody>
            {o.lines.map((l, i) => {
              const c = CAT[l.sku!];
              return <tr key={i}><td>{c.short} × {l.qty} {unitStr(c.unit, l.qty)}</td><td>{rs(amt(l))}</td></tr>;
            })}
            <tr className="tot"><td>Total</td><td>{rs(total(o))}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="acts doc-acts">
        <button className="btn small" onClick={() => dispatch({ type: 'doc', doc: { kind: 'po', order: o.id } })}>{I.doc()} Purchase order</button>
        <button className="btn small" onClick={() => dispatch({ type: 'doc', doc: { kind: 'invoice', order: o.id } })}>{I.doc()} Tax invoice</button>
      </div>
      <div className="card">
        <h3>Razorpay payment link</h3>
        <div className="paylink">{I.link()}<span>{o.payLink}<small>UPI, cards and netbanking. Payment reconciles to {o.invNo} in Tally automatically.</small></span></div>
      </div>
      <div className="card">
        <h3>Order echo on WhatsApp</h3>
        <label className="toggle">
          <input type="checkbox" checked={!!o.echo} onChange={(e) => dispatch({ type: 'echo', on: e.target.checked })} />
          Send {r.owner} a copy so he can catch a mistake before dispatch
        </label>
        {o.echo && <div className="echo">{echoText(o)}</div>}
      </div>
    </Frame>
  );
}
