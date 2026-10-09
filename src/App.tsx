import { Fragment, useEffect, useReducer, useState } from 'react';
import { RETAILERS } from './data/seed';
import { liveStatus, type LiveState } from './lib/api';
import { fresh, reducer, STOP_REASONS } from './state/store';
import { I } from './components/icons';
import { StoryPanel } from './components/StoryPanel';
import { Approved } from './screens/Approved';
import { Done } from './screens/Done';
import { DraftPO } from './screens/DraftPO';
import { Failure } from './screens/Failure';
import { Inbox } from './screens/Inbox';
import { Learned } from './screens/Learned';
import { Live } from './screens/Live';

export default function App() {
  const [S, dispatch] = useReducer(reducer, undefined, fresh);
  const [liveState, setLiveState] = useState<LiveState>('checking');

  useEffect(() => {
    liveStatus().then(setLiveState);
  }, []);

  // Toasts: 3 seconds, 4 seconds for "Learned".
  useEffect(() => {
    if (!S.toast) return;
    const id = S.toast.id;
    const t = setTimeout(() => dispatch({ type: 'clearToast', id }), S.toast.learn ? 4000 : 3000);
    return () => clearTimeout(t);
  }, [S.toast]);

  const v = S.view;
  const o = v.id ? S.orders.find((x) => x.id === v.id) : undefined;
  const props = { S, dispatch };

  let screen;
  if (v.name === 'po' && o) screen = <DraftPO {...props} o={o} />;
  else if (v.name === 'approved' && o) screen = <Approved {...props} o={o} />;
  else if (v.name === 'human' && o) screen = <Failure {...props} o={o} />;
  else if (v.name === 'done' && o) screen = <Done {...props} o={o} />;
  else if (v.name === 'live') screen = <Live {...props} liveState={liveState} setLiveState={setLiveState} />;
  else if (v.name === 'learned') screen = <Learned {...props} />;
  else screen = <Inbox {...props} />;

  return (
    <div className="stage">
      <div className="phone">
        {/* keyed so each screen opens scrolled to the top */}
        <Fragment key={v.name + (v.id ?? '')}>{screen}</Fragment>
        {S.toast && (
          <div className="toast" role="status" key={S.toast.id}>
            {S.toast.learn ? I.spark() : I.ok()}
            <div>{S.toast.head && <b>{S.toast.head}</b>}{S.toast.t}</div>
          </div>
        )}
        {S.sheet && o && (
          <div className="scrim" onClick={(e) => e.target === e.currentTarget && dispatch({ type: 'closesheet' })}>
            <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="stop-title">
              <h3 id="stop-title">Stop this order?</h3>
              <p>No PO, invoice or payment link goes to {RETAILERS[o.retailer].name}. Pick a reason so the desk learns.</p>
              {STOP_REASONS.map((x) => (
                <button key={x} className="opt" onClick={() => dispatch({ type: 'stopwhy', v: x })}>{x}</button>
              ))}
              <button className="btn ghost wide" autoFocus onClick={() => dispatch({ type: 'closesheet' })}>Keep the draft</button>
            </div>
          </div>
        )}
      </div>
      <StoryPanel {...props} />
    </div>
  );
}
