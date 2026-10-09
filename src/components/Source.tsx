import { useEffect, useState, type Dispatch } from 'react';
import type { Action } from '../state/store';
import type { Order } from '../types';
import { I } from './icons';

/** 34 bars of deterministic pseudo-random height, seeded by the note's duration. */
const bars = (dur: number) =>
  Array.from({ length: 34 }, (_, i) => Math.min(100, 18 + Math.abs(Math.sin(i * 1.7 + dur)) * 70 + ((i * 37) % 23)));

function Voice({ o, playing, dispatch, compact }: { o: Order; playing: boolean; dispatch: Dispatch<Action>; compact?: boolean }) {
  const [full, setFull] = useState(false);
  const dur = o.dur ?? 0;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => dispatch({ type: 'play', id: null }), dur * 1000);
    return () => clearTimeout(t);
  }, [playing, dur, dispatch]);

  const parts = o.raw.split(/(\[(?:unclear|traffic noise)\])/g);
  return (
    <div className={`voice ${playing ? 'playing' : ''}`} style={{ ['--dur' as string]: `${dur}s` }}>
      <div className="vrow">
        <button className="play" onClick={() => dispatch({ type: 'play', id: playing ? null : o.id })} aria-label={`${playing ? 'Pause' : 'Play'} voice note`}>
          {playing ? I.pause() : I.play()}
        </button>
        <div className="wave" aria-hidden="true">
          {bars(dur).map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
          <span className="prog" key={playing ? 'p' : 's'} />
        </div>
        <span className="vdur">0:{String(dur).padStart(2, '0')}</span>
      </div>
      {!compact && (
        <>
          <p className={`transcript ${full ? '' : 'clamp2'}`}>
            {parts.map((p, i) => (/^\[.*\]$/.test(p) ? <span key={i} className="unk">{p.slice(1, -1)}</span> : p))}
          </p>
          {!full && <button className="linkbtn small-link" onClick={() => setFull(true)}>Show all</button>}
        </>
      )}
    </div>
  );
}

function Chit({ o, compact }: { o: Order; compact?: boolean }) {
  const c = o.chit!;
  const shown = compact ? c.lines.slice(0, 2) : c.lines;
  return (
    <div className="chit" role="img" aria-label={`Handwritten chit: ${c.lines.map((l) => l.replace(/[[\]]/g, '')).join(', ')}`}>
      <div className="hd"><span>{c.head[0]}</span><span>{c.head[1]}</span></div>
      {shown.map((line, i) => (
        <div key={i}>
          {line.split(/(\[[^\]]+\])/g).map((p, k) => (/^\[.*\]$/.test(p) ? <span key={k} className="smudge">{p.slice(1, -1)}</span> : p))}
        </div>
      ))}
      {compact && c.lines.length > 2 && <div className="chit-more">+ {c.lines.length - 2} more lines</div>}
      <span className="tear" />
    </div>
  );
}

export function Source({ o, playing, dispatch, compact }: { o: Order; playing: boolean; dispatch: Dispatch<Action>; compact?: boolean }) {
  switch (o.channel) {
    case 'voice':
      return <Voice o={o} playing={playing} dispatch={dispatch} compact={compact} />;
    case 'chit':
      return <Chit o={o} compact={compact} />;
    case 'photo':
      return (
        <>
          <div className="photo">{o.photoUrl ? <img src={o.photoUrl} alt="Chit photo sent by the retailer" /> : null}</div>
          {o.raw ? <div className="bubble" style={{ marginTop: 8 }}>{o.raw}</div> : null}
        </>
      );
    case 'call':
      return <div className={`callnote ${compact ? 'clamp3' : ''}`}>{o.raw}</div>;
    default:
      return <div className={`bubble ${compact ? 'clamp3' : ''}`}>{o.raw}</div>;
  }
}
