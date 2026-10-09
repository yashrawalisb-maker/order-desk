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
        <span className="rc-sub">{showRetailer ? c.inv.no : `${r.terms}-day terms`}</span>
        <span className="chip red">{c.st.days} days late</span>
      </div>

      {c.waiting && (
        <div className="lever">
          <span>Has a {rs(total(c.waiting))} order waiting: ship it against a part-payment.</span>
          <button className="btn small primary" onClick={() => dispatch({ type: 'open', id: c.waiting!.id })}>Open order</button>
        </div>
      )}
      {c.held && (
        <div className="flag done">{I.ok()}<span>{rs(total(c.held))} order ships when {rs(c.held.release!.amount)} is paid</span></div>
      )}

      <details className="handoff">
        <summary>{c.inv.handedOff ? `With Razorpay’s recovery agent since ${fmtShort(c.inv.handedOff)}` : 'Chasing: Razorpay’s recovery agent'}</summary>
        <ul>{c.pack.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </details>
      <div className="acts">
        {!c.inv.handedOff && <button className={`btn small ${c.waiting ? '' : 'primary'}`} onClick={() => dispatch({ type: 'handoff', no: c.inv.no })}>Hand off to recovery agent</button>}
        <button className="btn small" onClick={() => dispatch({ type: 'go', view: { name: 'invoice', id: c.inv.no } })}>Invoice</button>
      </div>
    </section>
  );
}
