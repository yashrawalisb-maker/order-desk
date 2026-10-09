import type { Dispatch } from 'react';
import { RETAILERS } from '../data/seed';
import { isOpen, openFlags, pendingLow, rs, unmatched } from '../lib/money';
import type { Action } from '../state/store';
import type { Order } from '../types';
import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';
import { chIcon, chName } from '../components/icons';

function Chips({ o }: { o: Order }) {
  if (o.status === 'draft') {
    const lo = pendingLow(o) + unmatched(o);
    const fl = openFlags(o);
    return (
      <>
        <span className="chip blue">Draft ready</span>
        {fl > 0 && <span className="chip amber">{fl} to check</span>}
        {lo > 0 && <span className="chip amber">{lo} unclear</span>}
        {o.live && <span className="chip">Drafted live</span>}
      </>
    );
  }
  if (o.status === 'human') return <span className="chip red">Couldn’t read it</span>;
  if (o.status === 'approved') return <span className="chip green">Invoiced {o.approvedAt}</span>;
  if (o.status === 'handled') return <span className="chip">Handled by hand</span>;
  return <span className="chip">{o.status === 'held' ? 'On hold' : 'Stopped'}: {o.stopReason}</span>;
}

function OrderCard({ o, dispatch }: { o: Order; dispatch: Dispatch<Action> }) {
  const r = RETAILERS[o.retailer];
  const pv = o.channel === 'chit' ? `Chit photo, ${o.chit!.lines.length} lines` : o.raw.replace(/\n/g, ', ') || 'Chit photo';
  return (
    <button className={`order ${isOpen(o) ? '' : 'done'}`} onClick={() => dispatch({ type: 'open', id: o.id })}>
      <span className="ch" title={chName(o.channel)}>{chIcon(o.channel)}<span className="sr">{chName(o.channel)}</span></span>
      <span className="mid">
        <span className="row"><span className="nm">{r.name}</span><span className="tm">{o.at}</span></span>
        <span className="pv">{pv}</span>
        <span className="chips"><Chips o={o} /></span>
      </span>
    </button>
  );
}

export function Inbox({ S, dispatch }: ScreenProps) {
  const pct = Math.round((100 * S.wk.within) / S.wk.total);
  const open = S.orders.filter(isOpen);
  const done = S.orders.filter((o) => !isOpen(o));
  const M = S.money;
  return (
    <Frame
      bar={<><Title h="Order desk" sub="Gupta Distributors, Indore" /><button className="avatar" onClick={() => dispatch({ type: 'profile' })} aria-label="Account: Rajesh Gupta">RG</button></>}
      bottom={<TabBar S={S} dispatch={dispatch} />}
    >
      <div className="ns">
        <div className="big">{rs(M.leak + M.held)}</div>
        <p>protected this week: wrong rates caught, risky credit held.{M.asked ? ` And ${rs(M.asked)} of usual items asked about.` : ''}</p>
      </div>
      <div className="ns2"><b>{pct}%</b> of orders approved within an hour <span>31% before Order Desk</span></div>
      <h2 className="sec">Needs you <span>{open.length}</span></h2>
      {open.length ? open.map((o) => <OrderCard key={o.id} o={o} dispatch={dispatch} />) : (
        <div className="empty">All caught up. New orders appear here the moment they arrive.</div>
      )}
      {done.length > 0 && (
        <>
          <h2 className="sec">Done today <span>{done.length}</span></h2>
          {done.map((o) => <OrderCard key={o.id} o={o} dispatch={dispatch} />)}
        </>
      )}
    </Frame>
  );
}
