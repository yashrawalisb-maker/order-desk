import { useState, type Dispatch } from 'react';
import { RETAILERS } from '../data/seed';
import { rs, total } from '../lib/money';
import { releaseMessage, releaseOptions, releaseTarget } from '../lib/overdue';
import { invRemaining, invState } from '../lib/receivables';
import type { Action, State } from '../state/store';
import type { Order } from '../types';

/** Ship the new order once part of the overdue invoice is paid: Rajesh picks how much. */
export function ReleaseSheet({ S, o, dispatch }: { S: State; o: Order; dispatch: Dispatch<Action> }) {
  const inv = releaseTarget(S, o);
  const opts = inv ? releaseOptions(inv) : [];
  const [pick, setPick] = useState('half');
  if (!inv) return null;
  const r = RETAILERS[o.retailer];
  const amount = opts.find((x) => x.id === pick)!.amount;
  const st = invState(inv);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && dispatch({ type: 'closesheet' })}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rel-title">
        <h3 id="rel-title">Ship when part is paid</h3>
        <p>{r.name} owes {rs(invRemaining(inv))} on {inv.no}, {st.days} days late. The {rs(total(o))} order stays packed until {r.owner} pays the amount you choose through the Razorpay link.</p>
        <div className="seg rel-opts" role="group" aria-label="How much before shipping">
          {opts.map((x) => (
            <button key={x.id} aria-pressed={pick === x.id} onClick={() => setPick(x.id)}>
              {x.label}<small>{rs(x.amount)}</small>
            </button>
          ))}
        </div>
        <div className="label" style={{ marginTop: 12 }}><span>WhatsApp to {r.owner}</span></div>
        <div className="echo" style={{ margin: '0 0 12px' }}>{releaseMessage(o, inv, amount)}</div>
        <button className="btn primary wide" onClick={() => dispatch({ type: 'release', amount })}>Send part-payment link for {rs(amount)}</button>
        <button className="btn ghost wide" autoFocus onClick={() => dispatch({ type: 'closesheet' })}>Cancel</button>
      </div>
    </div>
  );
}
