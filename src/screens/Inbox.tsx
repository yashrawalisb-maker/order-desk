import { useEffect, useRef, useState, type Dispatch } from 'react';
import { CAT, RETAILERS } from '../data/seed';
import { isOpen, openFlags, pendingLow, rs, total, unitStr, unmatched } from '../lib/money';
import { duesOf } from '../lib/receivables';
import type { Action, State } from '../state/store';
import type { Order } from '../types';
import { Frame, TabBar, type ScreenProps } from '../components/Chrome';
import { I, chIcon, chName } from '../components/icons';
import { Source } from '../components/Source';

/** At most two chips: the things that decide whether Rajesh can approve fast. */
function chips(S: State, o: Order): { t: string; tone: string }[] {
  if (o.status === 'human') return [{ t: 'Couldn’t read it', tone: 'red' }];
  const out: { t: string; tone: string }[] = [];
  const dues = o.orderFlag && !o.orderFlag.resolved ? duesOf(S.invoices, o.retailer).amount : 0;
  if (dues) out.push({ t: `${rs(dues)} overdue`, tone: 'red' });
  const check = openFlags(o) - (dues ? 1 : 0) + pendingLow(o) + unmatched(o);
  if (check) out.push({ t: `${check} to check`, tone: 'amber' });
  if (!out.length) out.push({ t: o.live ? 'Drafted live' : 'Ready to approve', tone: o.live ? '' : 'green' });
  return out.slice(0, 2);
}

function OrderCard({ S, o, n, of, dispatch }: { S: State; o: Order; n: number; of: number; dispatch: Dispatch<Action> }) {
  const r = RETAILERS[o.retailer];
  const items = o.lines.length;
  return (
    <article className="deck-card" data-i={n} aria-label={`Order ${n} of ${of}: ${r.name}`}>
      <div className="dc-top"><span className="ch">{chIcon(o.channel)}</span><span>{chName(o.channel)} · {o.at}</span></div>
      <h2 className="dc-name">{r.name}</h2>
      <p className="dc-sub">{r.owner} · {r.area}</p>
      <div className="dc-preview">
        <Source o={o} playing={S.playing === o.id} dispatch={dispatch} compact />
        {o.status === 'draft' && (
          <ul className="dc-items" aria-label="Items">
            {o.lines.slice(0, 4).map((l, i) => (
              <li key={i}>
                <span>{l.sku ? CAT[l.sku].short : `${l.itemText || l.heard} (not in catalogue)`}</span>
                {l.sku && <b>{l.qty} {unitStr(CAT[l.sku].unit, l.qty)}</b>}
              </li>
            ))}
            {o.lines.length > 4 && <li className="more">+ {o.lines.length - 4} more</li>}
          </ul>
        )}
        {o.status === 'human' && o.why && <p className="dc-why">{o.why}</p>}
      </div>
      <div className="dc-foot">
        {o.status === 'draft' && (
          <div className="dc-total"><b>{rs(total(o))}</b><span>{items} item{items === 1 ? '' : 's'}</span></div>
        )}
        <div className="chips">{chips(S, o).map((c) => <span key={c.t} className={`chip ${c.tone}`}>{c.t}</span>)}</div>
        <button className="btn primary wide" onClick={() => dispatch({ type: 'open', id: o.id })}>
          {o.status === 'human' ? 'See message' : 'Review order'}
        </button>
      </div>
    </article>
  );
}

export function Inbox({ S, dispatch }: ScreenProps) {
  const open = S.orders.filter(isOpen);
  const doneCount = S.orders.filter((o) => !isOpen(o)).length;
  const pct = Math.round((100 * S.wk.within) / S.wk.total);
  const deck = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState(1);

  // Counter follows whichever card is mostly in view.
  useEffect(() => {
    const root = deck.current?.closest('.deck') as HTMLElement | null;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setAt(Number((e.target as HTMLElement).dataset.i));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('[data-i]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [open.length]);

  const counter = open.length === 0 ? 'All caught up' : at > open.length ? 'All done' : `Order ${at} of ${open.length}`;

  return (
    <Frame
      bar={
        <>
          <div className="grow"><h1>Order desk</h1><div className="sub">{rs(S.money.leak + S.money.held)} protected this week</div></div>
          <button className="btn small" onClick={() => dispatch({ type: 'go', view: { name: 'live' } })}>{I.plus()} Live order</button>
          <button className="avatar" onClick={() => dispatch({ type: 'profile' })} aria-label="Account: Rajesh Gupta">RG</button>
        </>
      }
      strip={<section className="deck-strip" aria-label="Order progress"><b aria-live="polite">{counter}</b><span>{pct}% approved within an hour</span></section>}
      bodyClass="deck"
      bottom={<TabBar S={S} dispatch={dispatch} />}
    >
      <span ref={deck} hidden />
      {open.map((o, i) => <OrderCard key={o.id} S={S} o={o} n={i + 1} of={open.length} dispatch={dispatch} />)}
      <article className="deck-card deck-end" data-i={open.length + 1} aria-label="End of orders">
        <div className="okmark">{I.okBig()}</div>
        <h2 className="dc-name">{open.length ? 'That’s everything for now' : 'All caught up'}</h2>
        <p className="dc-sub">New orders appear here the moment they arrive.</p>
        <div className="dc-foot">
          {doneCount > 0 && <button className="btn wide" onClick={() => dispatch({ type: 'tab', v: 'dash', id: 'today' })}>Done today · {doneCount}</button>}
          <button className="btn wide" onClick={() => dispatch({ type: 'go', view: { name: 'live' } })}>Try a live order</button>
        </div>
      </article>
    </Frame>
  );
}
