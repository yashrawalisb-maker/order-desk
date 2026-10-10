import { RETAILERS } from '../data/seed';
import { echoText } from '../lib/messages';
import { rs, total } from '../lib/money';
import type { Order } from '../types';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { I } from '../components/icons';

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
        <p>Ready to send to {r.owner}</p>
      </div>
      <div className="card rows">
        <button className="row" onClick={() => dispatch({ type: 'doc', doc: { kind: 'invoice', order: o.id } })}>
          <span className="ic-box">{I.doc()}</span>
          <span className="row-main"><b>Invoice {o.invNo}</b><small>{o.lines.length} items · synced to Tally</small></span>
          <span className="row-amt">{rs(total(o))}</span>
        </button>
        <button className="row" onClick={() => dispatch({ type: 'doc', doc: { kind: 'po', order: o.id } })}>
          <span className="ic-box">{I.doc()}</span>
          <span className="row-main"><b>Purchase order</b><small>{o.poNo}</small></span>
          <span className="row-go" aria-hidden="true">›</span>
        </button>
        <div className="row">
          <span className="ic-box brand">{I.link()}</span>
          <span className="row-main"><b>Razorpay payment link</b><small>{o.payLink}</small></span>
        </div>
      </div>
      <div className="card">
        <label className="toggle">
          <input type="checkbox" checked={!!o.echo} onChange={(e) => dispatch({ type: 'echo', on: e.target.checked })} />
          Send {r.owner} a WhatsApp copy of the order
        </label>
        {o.echo && (
          <details className="peek">
            <summary>Preview message</summary>
            <div className="echo">{echoText(o)}</div>
          </details>
        )}
      </div>
    </Frame>
  );
}
