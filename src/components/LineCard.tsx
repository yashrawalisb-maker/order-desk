import type { Dispatch } from 'react';
import { CATALOG, CAT } from '../data/seed';
import { flagView } from '../lib/flags';
import { amt, rateOf, rs, unitStr } from '../lib/money';
import type { Action } from '../state/store';
import type { Line, Order } from '../types';
import { FlagCard, Resolved } from './FlagCard';
import { chIcon, I } from './icons';

export function LineCard({ o, l, i, dispatch }: { o: Order; l: Line; i: number; dispatch: Dispatch<Action> }) {
  const c = l.sku ? CAT[l.sku] : null;
  const locked = o.status !== 'draft';
  const hand = o.channel === 'chit';
  const low = l.conf === 'low' && !l.confirmed;

  return (
    <div className={`line ${low ? 'low' : ''}`}>
      {c ? (
        <div className="l-top">
          <div className="l-name">
            {c.name}
            <small>
              {rs(rateOf(l))}/{c.unit}
              {l.rate != null && l.rate !== c.rate ? <span className="edited">rate honoured</span> : null}
            </small>
          </div>
          <div className="l-amt">{rs(amt(l))}</div>
        </div>
      ) : (
        <div className="l-top">
          <div className="l-name">Not in your catalogue<small>They wrote: {l.itemText || l.heard}</small></div>
          <div className="l-amt">–</div>
        </div>
      )}

      <div className="l-mid">
        <div className={`heard ${hand ? 'hand' : ''}`}>
          {hand ? I.chit() : chIcon(o.channel)}
          <q>{l.heard}</q>
        </div>
        {c && (locked ? (
          <span className="chip">{l.qty} {unitStr(c.unit, l.qty)}</span>
        ) : (
          <div className="stepper">
            <button onClick={() => dispatch({ type: 'qty', i, d: -1 })} aria-label={`Fewer ${c.short}`}>−</button>
            <span aria-live="polite">{l.qty} {unitStr(c.unit, l.qty)}</span>
            <button onClick={() => dispatch({ type: 'qty', i, d: 1 })} aria-label={`More ${c.short}`}>+</button>
          </div>
        ))}
      </div>

      {!c && !locked && (
        <>
          <select className="skusel" aria-label="Pick the right item" value="" onChange={(e) => e.target.value && dispatch({ type: 'pick', i, sku: e.target.value })}>
            <option value="">Pick the right item…</option>
            {CATALOG.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <div className="acts"><button className="btn small" onClick={() => dispatch({ type: 'drop', i })}>Remove line</button></div>
        </>
      )}

      {low && c && !locked && (
        <div className="check">
          <b>Check this.</b> {l.note || 'I’m not sure I read this right.'}
          <div className="acts">
            {l.choices && l.choices.length ? (
              l.choices.map((n) => (
                <button key={n} className="btn small" onClick={() => dispatch({ type: 'choose', i, n })}>{n} {unitStr(c.unit, n)}</button>
              ))
            ) : (
              <button className="btn small" onClick={() => dispatch({ type: 'choose', i, n: l.qty })}>Looks right</button>
            )}
          </div>
        </div>
      )}

      {l.flag && (l.flag.resolved ? (
        <Resolved text={l.flag.resolved} />
      ) : !locked && l.sku ? (
        <FlagCard f={flagView(o, l)} onAction={(k) => dispatch({ type: 'flag', i, k })} />
      ) : null)}
    </div>
  );
}

/** A line that needs nothing from Rajesh: one compact row inside the order card. */
export function LineRow({ o, l, i, dispatch }: { o: Order; l: Line; i: number; dispatch: Dispatch<Action> }) {
  const c = CAT[l.sku!];
  return (
    <div className="lrow">
      <div className="lrow-main">
        <b>{c.name}</b>
        <small>
          {rs(amt(l))}
          {l.rate != null && l.rate !== c.rate ? ' · rate honoured' : ''}
          {l.flag?.resolved ? ` · ${l.flag.resolved}` : ''} · <q className={o.channel === 'chit' ? 'hand' : ''}>{l.heard}</q>
        </small>
      </div>
      <div className="stepper">
        <button onClick={() => dispatch({ type: 'qty', i, d: -1 })} aria-label={`Fewer ${c.short}`}>−</button>
        <span aria-live="polite">{l.qty} {unitStr(c.unit, l.qty)}</span>
        <button onClick={() => dispatch({ type: 'qty', i, d: 1 })} aria-label={`More ${c.short}`}>+</button>
      </div>
    </div>
  );
}
