import { RETAILERS } from '../data/seed';
import { rs, total } from '../lib/money';
import type { Order } from '../types';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { chName } from '../components/icons';
import { LineCard } from '../components/LineCard';
import { Source } from '../components/Source';

export function Done({ S, dispatch, o }: ScreenProps & { o: Order }) {
  const r = RETAILERS[o.retailer];
  const st =
    o.status === 'approved' ? <span className="chip green">Invoiced and link sent {o.approvedAt}</span>
    : o.status === 'handled' ? <span className="chip">Handled by hand</span>
    : <span className="chip">{o.status === 'held' ? 'On hold' : 'Stopped'}: {o.stopReason}</span>;
  return (
    <Frame bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back to orders" /><Title h={r.name} sub={`${chName(o.channel)}, ${o.at}`} /></>}>
      <div style={{ margin: '0 2px 12px' }}>{st}</div>
      <div className="srcwrap">
        <div className="label"><span>What {r.owner} sent</span></div>
        <Source o={o} playing={S.playing === o.id} dispatch={dispatch} />
      </div>
      {o.lines.length > 0 && (
        <>
          <div className="pohead"><h2>Purchase order</h2><span>{rs(total(o))}</span></div>
          {o.lines.map((l, i) => <LineCard key={i} o={o} l={l} i={i} dispatch={dispatch} />)}
        </>
      )}
    </Frame>
  );
}
