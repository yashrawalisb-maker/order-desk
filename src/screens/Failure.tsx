import { RETAILERS } from '../data/seed';
import type { Order } from '../types';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { I, chName } from '../components/icons';
import { Source } from '../components/Source';

export function Failure({ S, dispatch, o }: ScreenProps & { o: Order }) {
  const r = RETAILERS[o.retailer];
  return (
    <Frame
      bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back to orders" /><Title h={r.name} sub={`${chName(o.channel)}, ${o.at}`} /></>}
      bottom={
        <div className="actionbar">
          <button className="btn" onClick={() => dispatch({ type: 'callback' })}>Call {r.owner}</button>
          <button className="btn primary" style={{ flex: 1 }} onClick={() => dispatch({ type: 'handled' })}>Mark as handled</button>
        </div>
      }
    >
      <div className="srcwrap">
        <div className="label"><span>What {r.owner} sent</span></div>
        <Source o={o} playing={S.playing === o.id} dispatch={dispatch} />
      </div>
      <div className="flag red">
        <div className="ft">{I.flag()}No draft for this one</div>
        <p>{o.why} Nothing is lost: the raw message stays here, the way it would without Order Desk.</p>
      </div>
    </Frame>
  );
}
