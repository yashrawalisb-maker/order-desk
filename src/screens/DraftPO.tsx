import { CAT, RETAILERS } from '../data/seed';
import { orderFlagView } from '../lib/flags';
import { pendingLow, rs, total, unmatched, viewOrderFor } from '../lib/money';
import { duesOf } from '../lib/receivables';
import type { Order } from '../types';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { FlagCard, Resolved } from '../components/FlagCard';
import { I, chName } from '../components/icons';
import { LineCard } from '../components/LineCard';
import { Source } from '../components/Source';

export function DraftPO({ S, dispatch, o }: ScreenProps & { o: Order }) {
  const r = RETAILERS[o.retailer];
  const lo = pendingLow(o) + unmatched(o);
  const order = o.viewOrder ?? viewOrderFor(o);
  const g = o.gap ? CAT[o.gap.sku] : null;
  const dues = duesOf(S.invoices, o.retailer);

  return (
    <Frame
      bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back to orders" /><Title h={r.name} sub={`${chName(o.channel)}, ${o.at}, ${r.area}`} /></>}
      bottom={
        <div className="actionbar">
          <div className="total"><small>Order total</small><b>{rs(total(o))}</b></div>
          <button className="btn danger" onClick={() => dispatch({ type: 'stop' })}>Stop</button>
          <button className="btn primary" onClick={() => dispatch({ type: 'approve' })} disabled={lo > 0 || !o.lines.length}>
            {lo ? `Check ${lo} line${lo > 1 ? 's' : ''} first` : 'Approve PO'}
          </button>
        </div>
      }
    >
      <div className="srcwrap">
        <div className="label">
          <span>What {r.owner} sent</span>
          {o.live && <span className="livebadge">{I.spark()} Drafted live by Claude</span>}
        </div>
        <Source o={o} playing={S.playing === o.id} dispatch={dispatch} />
      </div>

      <div className="pohead"><h2>Draft purchase order</h2><span>{o.lines.length} lines</span></div>

      {o.orderFlag && (o.orderFlag.resolved ? (
        <Resolved text={o.orderFlag.resolved} className="orderflag" />
      ) : dues.amount > 0 ? (
        <FlagCard f={orderFlagView(o, dues)} className="orderflag" onAction={(k) => dispatch({ type: 'oflag', k })} />
      ) : (
        <Resolved text="Overdue balance cleared since this order came in" className="orderflag" />
      ))}

      {o.gap && g && (o.gap.resolved ? (
        <Resolved text={`${g.short}: ${o.gap.resolved}`} className="orderflag" />
      ) : (
        <FlagCard
          tone="grow"
          className="orderflag"
          icon={I.spark()}
          f={{
            title: 'Missing from his usual order',
            reason: `${g.name}: ${o.gap.usual}, not in this one. Worth ${rs(g.rate)} if he just forgot.`,
            actions: [{ label: 'Ask in the echo', kind: 'resolve' }, { label: 'Skip', kind: 'resolve' }],
          }}
          onAction={(k) => dispatch({ type: 'gap', k: k === 0 ? 'ask' : 'skipgap' })}
        />
      ))}

      {order.map((i) => <LineCard key={i} o={o} l={o.lines[i]} i={i} dispatch={dispatch} />)}
      {!o.lines.length && <div className="empty">No lines left on this order.</div>}
    </Frame>
  );
}
