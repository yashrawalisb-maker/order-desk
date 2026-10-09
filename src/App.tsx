import { Fragment, useEffect, useReducer, useState, type MouseEvent } from 'react';
import { DISTRIBUTOR, RETAILERS } from './data/seed';
import { liveStatus, type LiveState } from './lib/api';
import { load, save } from './state/persist';
import { reducer, STOP_REASONS } from './state/store';
import { DocView } from './components/DocView';
import { I } from './components/icons';
import { StoryPanel } from './components/StoryPanel';
import { Approved } from './screens/Approved';
import { Dashboard } from './screens/Dashboard';
import { Done } from './screens/Done';
import { DraftPO } from './screens/DraftPO';
import { Failure } from './screens/Failure';
import { History } from './screens/History';
import { Inbox } from './screens/Inbox';
import { InvoiceDetail } from './screens/InvoiceDetail';
import { Live } from './screens/Live';
import { Login } from './screens/Login';
import { RetailerDetail } from './screens/RetailerDetail';
import { Retailers } from './screens/Retailers';

export default function App() {
  const [S, dispatch] = useReducer(reducer, undefined, () => load());
  const [liveState, setLiveState] = useState<LiveState>('checking');

  useEffect(() => {
    liveStatus().then(setLiveState);
  }, []);

  // Keep the demo across reloads on this device.
  useEffect(() => {
    save(S);
  }, [S.session, S.orders, S.invoices, S.learned, S.wk, S.money, S.poSeq, S.live.retailer]);

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
  if (!S.session) screen = <Login dispatch={dispatch} />;
  else if (v.name === 'po' && o) screen = <DraftPO {...props} o={o} />;
  else if (v.name === 'approved' && o) screen = <Approved {...props} o={o} />;
  else if (v.name === 'human' && o) screen = <Failure {...props} o={o} />;
  else if (v.name === 'done' && o) screen = <Done {...props} o={o} />;
  else if (v.name === 'live') screen = <Live {...props} liveState={liveState} setLiveState={setLiveState} />;
  else if (v.name === 'retailers') screen = <Retailers {...props} />;
  else if (v.name === 'dash') screen = <Dashboard {...props} />;
  else if (v.name === 'history') screen = <History {...props} />;
  else if (v.name === 'retailer' && v.id && RETAILERS[v.id]) screen = <RetailerDetail {...props} id={v.id} />;
  else if (v.name === 'invoice' && v.id) screen = <InvoiceDetail {...props} no={v.id} />;
  else screen = <Inbox {...props} />;

  const closeSheet = (e: MouseEvent) => e.target === e.currentTarget && dispatch({ type: 'closesheet' });

  return (
    <>
      <div className="stage" aria-hidden={S.doc ? true : undefined}>
        <div className="phone">
          {/* keyed so each screen opens scrolled to the top */}
          <Fragment key={(S.session ? v.name + (v.id ?? '') : 'login')}>{screen}</Fragment>
          {S.toast && (
            <div className="toast" role="status" key={S.toast.id}>
              {S.toast.learn ? I.spark() : I.ok()}
              <div>{S.toast.head && <b>{S.toast.head}</b>}{S.toast.t}</div>
            </div>
          )}
          {S.sheet === 'stop' && o && (
            <div className="scrim" onClick={closeSheet}>
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
          {S.sheet === 'profile' && S.session && (
            <div className="scrim" onClick={closeSheet}>
              <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="profile-title">
                <div className="profile">
                  <span className="avatar big" aria-hidden="true">RG</span>
                  <div>
                    <h3 id="profile-title">{S.session.name}</h3>
                    <p>{DISTRIBUTOR.name}, Indore · +91 {S.session.phone.slice(0, 5)} {S.session.phone.slice(5)}</p>
                  </div>
                </div>
                <dl className="facts">
                  <dt>GSTIN</dt><dd>{DISTRIBUTOR.gstin}</dd>
                  <dt>Payments</dt><dd>Razorpay payment links</dd>
                  <dt>Accounting</dt><dd>Tally (synced)</dd>
                </dl>
                <button className="opt" onClick={() => { dispatch({ type: 'reset' }); }}>Reset demo data</button>
                <button className="opt danger" onClick={() => dispatch({ type: 'logout' })}>Sign out</button>
                <button className="btn ghost wide" autoFocus onClick={() => dispatch({ type: 'closesheet' })}>Close</button>
              </div>
            </div>
          )}
        </div>
        <StoryPanel {...props} />
      </div>
      {S.doc && <DocView S={S} dispatch={dispatch} />}
    </>
  );
}
