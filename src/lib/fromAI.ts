import { CAT } from '../data/seed.js';
import type { FlagAction, Line, Retailer } from '../types.js';

/**
 * Turn the model's JSON into PO lines. Everything the model says is treated as
 * untrusted: unknown SKUs become unmatched lines, numbers are clamped, strings
 * truncated, and flag buttons are always built here from the flag type.
 */
export function fromAI(res: unknown, r: Retailer): Line[] {
  const raw = (res && typeof res === 'object' && Array.isArray((res as { lines?: unknown }).lines)
    ? (res as { lines: unknown[] }).lines
    : []) as Record<string, unknown>[];

  return raw.slice(0, 20).filter((x) => x && typeof x === 'object').map((x) => {
    const sku = typeof x.sku === 'string' && CAT[x.sku] ? x.sku : null;
    const qty = Math.max(1, Math.round(Number(x.qty) || 1));
    const l: Line = {
      sku,
      qty,
      heard: String(x.heard || x.item_text || '').slice(0, 80),
      itemText: String(x.item_text || x.heard || '').slice(0, 60),
      conf: x.confidence === 'low' || !sku ? 'low' : 'high',
      note: String(x.note || '').slice(0, 140),
      choices: (Array.isArray(x.choices) ? x.choices : []).map(Number).filter((n) => n > 0).map(Math.round).slice(0, 3),
    };
    if (l.choices!.length && !l.choices!.includes(qty)) l.choices!.unshift(qty);

    const alts = (Array.isArray(x.alt_skus) ? x.alt_skus : []).filter((a): a is string => typeof a === 'string' && !!CAT[a] && a !== sku).slice(0, 2);
    const q = Number(x.quoted_rate);
    if (sku && q > 0 && Math.round(q) !== CAT[sku].rate) l.quotedRate = Math.round(q);

    const f = x.flag && typeof x.flag === 'object' ? (x.flag as Record<string, unknown>) : null;
    if (sku) {
      if (l.quotedRate) {
        // Price is always checked in code, whatever the model returned.
        l.flag = { type: 'price_mismatch' };
      } else if (f && f.type !== 'price_mismatch') {
        const t = String(f.type);
        const title = String(f.title || 'Worth a look').slice(0, 40);
        const reason = String(f.reason || '').slice(0, 180);
        let actions: FlagAction[];
        if (t === 'new_item' && alts.length) actions = [sku, ...alts].map((s) => ({ label: CAT[s].short, kind: 'setsku', sku: s }));
        else if (t === 'new_item') actions = [{ label: 'Looks right', kind: 'resolve', learn: `${r.name} now orders ${CAT[sku].short}. Added to his history.` }];
        else if (t === 'odd_quantity') {
          const u = r.usual[sku];
          actions = [{ label: `Keep ${qty}`, kind: 'learn' }];
          if (u && u[1] !== qty) actions.push({ label: `Make it ${u[1]}`, kind: 'setqty', qty: u[1] });
        } else actions = [{ label: 'Noted', kind: 'resolve' }];
        l.flag = { type: t, title, reason, actions };
      }
    }
    return l;
  });
}
