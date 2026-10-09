import type { Dispatch } from 'react';
import { RETAILERS } from '../data/seed';
import { rs, total } from '../lib/money';
import type { OverdueCase } from '../lib/overdue';
import { fmtShort } from '../lib/receivables';
import type { Action } from '../state/store';
import { I } from './icons';

export function OverdueCard({ c, dispatch, showRetailer = true }: { c: OverdueCase; dispatch: Dispatch<Action>; showRetailer?: boolean }) {
  const r = RETAILERS[c.inv.retailer];
  return (
    <section className="card overdue" aria-label={`${r.name}, ${c.inv.no} overdue`}>
      <div className="prof-top">
        <span className="rc-title">{showRetailer ? r.name : c.inv.no}</span>
        <span className="rc-amt">{rs(c.remaining)}</span>
      </div>
      <div className="prof-top">
        <span className="rc-sub">{showRetailer ? `${c.inv.no} · ` : ''}{c.st.days} days past {r.terms}-day terms</span>
        <span className="chip red">{c.st.days} days late</span>
      </div>

      {c.waiting && (
        <div className="flag grow">
          <div className="ft">{I.flag()}He has a new order waiting</div>
          <p>Ship his {rs(total(c.waiting))} order once he pays part of this. Order Desk sends the part-payment link; you decide how much.</p>
          <div className="acts"><button className="btn small" onClick={() => dispatch({ type: 'open', id: c.waiting!.id })}>Open the order</button></div>
        </div>
      )}
      {c.held && (
        <div className="flag done">{I.ok()}<span>{rs(total(c.held))} order on hold until {rs(c.held.release!.amount)} is paid (link sent {fmtShort(c.held.release!.sentOn)})</span></div>
      )}

      <div className="handoff">
        <b>{c.inv.handedOff ? `With Razorpay’s recovery agent since ${fmtShort(c.inv.handedOff)}` : 'Chasing goes to Razorpay’s recovery agent'}</b>
        <span className="muted-s">{c.inv.handedOff ? 'It received:' : 'It gets the invoice, the payment link and:'}</span>
        <ul>{c.pack.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <div className="acts">
          {!c.inv.handedOff && <button className="btn small primary" onClick={() => dispatch({ type: 'handoff', no: c.inv.no })}>Hand off to recovery agent</button>}
          <button className="btn small" onClick={() => dispatch({ type: 'go', view: { name: 'invoice', id: c.inv.no } })}>Open invoice</button>
        </div>
      </div>
    </section>
  );
}
