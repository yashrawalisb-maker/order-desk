import { useEffect, useRef, useState } from 'react';
import { LIVE_RETAILERS, MAX_TEXT, RETAILERS } from '../data/seed';
import { samplesFor, type Sample } from '../data/samples';
import { DraftError, downscale, requestDraft, type LiveState } from '../lib/api';
import { fromAI } from '../lib/fromAI';
import { payCard, threadOf } from '../lib/messages';
import { isOpen, rs } from '../lib/money';
import { nowT } from '../state/store';
import type { Order, WaMsg } from '../types';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { I } from '../components/icons';
import { Source } from '../components/Source';

const ERRORS: Record<string, string> = {
  cancelled: '',
  rate_limited: 'Too many orders in a row. Wait a minute, then try again.',
  invalid_json: 'The draft came back garbled. Try again, or shorten the order.',
  empty_lines: 'No order lines found. Try writing items and quantities.',
  image_rejected: 'That photo couldn’t be read. Try a clearer or smaller image.',
  refused: 'Claude couldn’t draft this one. Try a different order.',
  too_long: `That order is over ${MAX_TEXT.toLocaleString('en-IN')} characters. Shorten it and try again.`,
  off: 'Live drafting is switched off on this deployment, so only the samples below can be sent.',
};
const errorCopy = (code: string) => (code in ERRORS ? ERRORS[code] : 'Couldn’t reach Claude. Try again.');

const STATUS: Record<Order['status'], string> = {
  draft: 'Waiting for Rajesh', human: 'Waiting for Rajesh', approved: 'Invoiced', held: 'On hold', stopped: 'Stopped', handled: 'Handled by phone',
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); rej(new DraftError('cancelled')); });
  });

export function Chat({ S, dispatch, liveState, setLiveState }: ScreenProps & { liveState: LiveState; setLiveState: (s: LiveState) => void }) {
  const L = S.live;
  const r = RETAILERS[L.retailer];
  const [file, setFile] = useState<File | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const thread = threadOf(S.wa, r.id);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [thread.length, L.busy, r.id]);

  const picked = sample && sample.retailer === r.id && sample.text === L.text.trim() ? sample : null;
  const canSend = !L.busy && (liveState === 'on' ? !!(L.text.trim() || file) : !!picked && !file);

  async function send() {
    const text = L.text.trim();
    if (!text && !file) return;
    dispatch({ type: 'live', patch: { busy: true, error: '' } });
    ctl.current = new AbortController();
    const signal = ctl.current.signal;
    try {
      let res: unknown;
      if (liveState === 'on') {
        const img = file ? await downscale(file) : null;
        res = await requestDraft({ retailerId: r.id, text, ...(img ? { imageBase64: img.data, imageMediaType: img.type } : {}) }, signal);
      } else if (picked && !file) {
        await wait(900, signal);
        res = picked.reply;
      } else throw new DraftError('off');
      const lines = fromAI(res, r);
      if (!lines.length) throw new DraftError('empty_lines');
      const o: Order = {
        id: 'L' + Date.now(), retailer: r.id, channel: file ? 'photo' : picked?.channel ?? 'text', at: nowT(), status: 'draft', live: true, raw: text, lines,
        photoUrl: file ? URL.createObjectURL(file) : null,
        ...(picked?.dur && !file ? { dur: picked.dur } : {}),
      };
      if (r.overdue > 0) o.orderFlag = { type: 'credit' };
      setFile(null);
      setSample(null);
      dispatch({ type: 'liveAdd', order: o });
    } catch (e) {
      const code = e instanceof DraftError ? e.code : 'network';
      if (code === 'off') setLiveState('off');
      dispatch({ type: 'live', patch: { busy: false, error: errorCopy(code) } });
    }
  }

  return (
    <Frame
      bar={
        <>
          <BackButton onClick={() => dispatch({ type: 'back' })} label="Back to Order Desk" />
          <span className="wa-avatar" aria-hidden="true">GD</span>
          <Title h="Gupta Distributors" sub={`${r.owner}’s WhatsApp · ${r.name}`} />
        </>
      }
      strip={
        <section className="wa-who" aria-label="Demo: whose phone this is">
          <span className="chip">Demo · retailer’s phone</span>
          <div className="seg" role="group" aria-label="Order as">
            {LIVE_RETAILERS.map((id) => (
              <button key={id} aria-pressed={L.retailer === id} disabled={L.busy} onClick={() => { setSample(null); dispatch({ type: 'live', patch: { retailer: id, text: '', error: '' } }); }}>
                {RETAILERS[id].owner}
              </button>
            ))}
          </div>
        </section>
      }
      bodyClass="wa-body"
      bottom={
        <div className="wa-compose">
          <div className="wa-samples" role="group" aria-label="Sample messages">
            {samplesFor(r.id).map((s) => (
              <button key={s.label} className="chip-btn" disabled={L.busy} aria-pressed={picked === s} onClick={() => { setSample(s); setFile(null); dispatch({ type: 'live', patch: { text: s.text, error: '' } }); }}>
                {s.channel === 'voice' ? I.mic() : I.text()} Sample {s.label.toLowerCase()}
              </button>
            ))}
          </div>
          {file && (
            <span className="filechip">
              {file.name.slice(0, 22)}
              <button onClick={() => setFile(null)} aria-label="Remove photo">×</button>
            </span>
          )}
          <div className="wa-input">
            <label className={`iconbtn ${liveState !== 'on' || L.busy ? 'off' : ''}`}>
              {I.photo()}<span className="sr-only">Attach a chit photo</span>
              <input type="file" accept="image/*" hidden disabled={liveState !== 'on' || L.busy} onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </label>
            <textarea
              aria-label="Message"
              rows={2}
              placeholder={liveState === 'on' ? 'Type an order the way you would on WhatsApp' : 'Pick a sample above'}
              disabled={L.busy}
              maxLength={MAX_TEXT}
              value={L.text}
              onChange={(e) => dispatch({ type: 'live', patch: { text: e.target.value } })}
            />
            <button className="wa-send" onClick={send} disabled={!canSend} aria-label="Send order">{I.send()}</button>
          </div>
          {L.error && <div className="note err" role="alert">{L.error}</div>}
        </div>
      }
    >
      <div className="wa-day">Today</div>
      {thread.map((m) => <Msg key={m.id} m={m} {...{ S, dispatch }} />)}
      {L.busy && (
        <div className="wa-row me">
          <div className="wa-b me">
            {file ? <div className="filechip">{file.name.slice(0, 22)}</div> : null}
            {L.text}
            <span className="wa-meta">{nowT()} · sending</span>
          </div>
          <div className="wa-demo" role="status">
            <span className="spin" /> Order Desk is reading it and checking {r.owner}’s history…
            <button className="linkbtn" onClick={() => ctl.current?.abort()}>Stop</button>
          </div>
        </div>
      )}
      <div ref={end} />
    </Frame>
  );
}

function Msg({ S, dispatch, m }: ScreenProps & { m: WaMsg }) {
  if (m.from === 'retailer') {
    const o = S.orders.find((x) => x.id === m.orderId);
    if (!o) return null;
    if (o.channel === 'call') {
      return <div className="wa-sys">{o.at} · Order taken on a call: {o.raw.replace(/^Call logged by /, 'logged by ')}</div>;
    }
    return (
      <div className="wa-row me">
        <div className={`wa-b me ${o.channel === 'text' ? '' : 'media'}`}>
          {o.channel === 'text' ? o.raw : <Source o={o} playing={S.playing === o.id} dispatch={dispatch} />}
          <span className="wa-meta">{o.at} <span aria-hidden="true">✓✓</span><span className="sr-only">, delivered</span></span>
        </div>
        <div className="wa-demo">
          <span>In Order Desk: {STATUS[o.status]}</span>
          {isOpen(o) && <button className="linkbtn" onClick={() => dispatch({ type: 'open', id: o.id })}>Open as Rajesh →</button>}
        </div>
      </div>
    );
  }
  const pay = payCard(S.wa, S.invoices, m);
  return (
    <div className="wa-row">
      <div className="wa-b">
        <span className="wa-text">{m.text}</span>
        {pay && (
          <div className="wa-pay">
            <span className="ic-box brand">{I.link()}</span>
            <span className="row-main"><b>Razorpay · {rs(pay.amount)}</b><small>{pay.link}</small></span>
            {pay.paid
              ? <span className="chip green">Paid</span>
              : <button className="btn small primary" onClick={() => dispatch({ type: 'paid', no: m.invNo! })}>Pay {rs(pay.amount)}</button>}
          </div>
        )}
        <span className="wa-meta">{m.at}</span>
      </div>
    </div>
  );
}
