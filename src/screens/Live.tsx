import { useEffect, useRef, useState } from 'react';
import { CAT, LIVE_EXAMPLES, LIVE_RETAILERS, MAX_TEXT, RETAILERS } from '../data/seed';
import { DraftError, downscale, requestDraft, type LiveState } from '../lib/api';
import { fromAI } from '../lib/fromAI';
import { rs } from '../lib/money';
import { nowT } from '../state/store';
import type { Order } from '../types';
import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';

const ERRORS: Record<string, string> = {
  cancelled: '',
  rate_limited: 'Too many drafts in a row. Wait a minute, then try again.',
  invalid_json: 'The draft came back garbled. Try again, or shorten the order.',
  empty_lines: 'No order lines found. Try writing items and quantities.',
  image_rejected: 'That photo couldn’t be read. Try a clearer or smaller image.',
  refused: 'Claude couldn’t draft this one. Try a different order.',
  too_long: `That order is over ${MAX_TEXT.toLocaleString('en-IN')} characters. Shorten it and try again.`,
  off: 'Live drafting is switched off on this deployment. The sample orders in the Orders tab show the full flow.',
};
const errorCopy = (code: string) => (code in ERRORS ? ERRORS[code] : 'Couldn’t reach Claude. Try again.');

export function Live({ S, dispatch, liveState, setLiveState }: ScreenProps & { liveState: LiveState; setLiveState: (s: LiveState) => void }) {
  const L = S.live;
  const r = RETAILERS[L.retailer];
  const [file, setFile] = useState<File | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const usual = Object.entries(r.usual).map(([k, [a, b]]) => `${CAT[k].short} ${a === b ? a : a + '–' + b}`).join(', ');

  async function draft() {
    const text = L.text.trim();
    if (!text && !file) {
      dispatch({ type: 'live', patch: { error: 'Type an order first, or tap “Use an example”.' } });
      return;
    }
    dispatch({ type: 'live', patch: { busy: true, error: '' } });
    ctl.current = new AbortController();
    try {
      const img = file ? await downscale(file) : null;
      const res = await requestDraft(
        { retailerId: r.id, text, ...(img ? { imageBase64: img.data, imageMediaType: img.type } : {}) },
        ctl.current.signal,
      );
      const lines = fromAI(res, r);
      if (!lines.length) throw new DraftError('empty_lines');
      const o: Order = {
        id: 'L' + Date.now(), retailer: r.id, channel: file ? 'photo' : 'text', at: nowT(), status: 'draft', live: true, raw: text, lines,
        photoUrl: file ? URL.createObjectURL(file) : null,
      };
      if (r.overdue > 0) o.orderFlag = { type: 'credit' };
      setFile(null);
      dispatch({ type: 'liveAdd', order: o });
    } catch (e) {
      const code = e instanceof DraftError ? e.code : 'network';
      if (code === 'off') setLiveState('off');
      dispatch({ type: 'live', patch: { busy: false, error: errorCopy(code) } });
    }
  }

  return (
    <Frame bar={<Title h="Try it live" sub="Claude drafts a PO from any order you type" />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      <p className="intro">Write an order the way a kirana owner would: Hinglish, nicknames, shorthand. The draft is checked against the retailer’s history and today’s price list.</p>

      <div className="field">
        <span id="lr-label">Order from</span>
        <div className="seg" role="group" aria-labelledby="lr-label">
          {LIVE_RETAILERS.map((id) => (
            <button key={id} aria-pressed={L.retailer === id} disabled={L.busy} onClick={() => dispatch({ type: 'live', patch: { retailer: id, error: '' } })}>
              {RETAILERS[id].name.replace(' Store', '').replace(' Traders', '')}
            </button>
          ))}
        </div>
        <p className="usual">Usually orders {usual}.{r.overdue ? ` ${rs(r.overdue)} overdue for ${r.overdueDays} days.` : ''}</p>
      </div>

      <div className="field">
        <label htmlFor="livetext">The order</label>
        <textarea
          id="livetext"
          placeholder={LIVE_EXAMPLES[L.retailer]}
          disabled={L.busy}
          maxLength={MAX_TEXT}
          value={L.text}
          onChange={(e) => dispatch({ type: 'live', patch: { text: e.target.value } })}
        />
        <div className="row2">
          <button className="linkbtn" disabled={L.busy} onClick={() => dispatch({ type: 'live', patch: { text: LIVE_EXAMPLES[L.retailer], error: '' } })}>Use an example</button>
          <label className="linkbtn">
            Add a chit photo
            <input type="file" accept="image/*" hidden disabled={L.busy} onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          {file && (
            <span className="filechip">
              {file.name.slice(0, 22)}
              <button onClick={() => setFile(null)} aria-label="Remove photo">×</button>
            </span>
          )}
          {L.text.length > MAX_TEXT * 0.8 && <span className="count">{L.text.length}/{MAX_TEXT}</span>}
        </div>
      </div>

      {liveState === 'off' && <div className="note">{ERRORS.off}</div>}

      {L.busy ? (
        <div className="busy" role="status">
          <span className="spin" />
          <span>Reading, matching to the catalogue and checking {r.name}’s history…</span>
          <button className="btn small" onClick={() => ctl.current?.abort()}>Stop</button>
        </div>
      ) : (
        <button className="btn primary wide" style={{ marginTop: 4 }} onClick={draft} disabled={liveState !== 'on'}>
          {liveState === 'checking' ? 'Connecting to Claude…' : 'Draft the PO'}
        </button>
      )}
      {L.error && <div className="note err" role="alert">{L.error}</div>}
    </Frame>
  );
}
