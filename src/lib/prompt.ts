import { CAT, CATALOG } from '../data/seed.js';
import type { Retailer } from '../types.js';
import { unitStr } from './money.js';

/** The live drafting prompt (PRD section 6.5). Used server-side only. */
export function buildPrompt(r: Retailer, text: string, hasImg: boolean): string {
  const cat = CATALOG.map(
    (c) => `${c.id} | ${c.name} | sold per ${c.unit} (${c.pack}) | ₹${c.rate} per ${c.unit} | nicknames: ${c.aka.join(', ')}`,
  ).join('\n');
  const usual = Object.entries(r.usual)
    .map(([k, [a, b]]) => `${k} (${CAT[k].short}): usually ${a === b ? a : a + ' to ' + b} ${unitStr(CAT[k].unit, b)}`)
    .join('; ');
  return `You are the order desk for Gupta Distributors, an FMCG distributor in Indore, India. A small retailer sent an order. Turn it into draft purchase-order lines using ONLY the catalogue below, and flag anything the distributor should look at before approving. The distributor makes every decision; you only draft and flag.

CATALOGUE (id | name | unit | rate | nicknames):
${cat}

RETAILER: ${r.name}
Order history (per order): ${usual || 'no history'}
Items not listed above have never been ordered by this retailer.
Overdue balance: ${r.overdue ? '₹' + r.overdue + ' for ' + r.overdueDays + ' days on ' + r.terms + '-day terms' : 'none'}

ORDER ${hasImg ? '(in the attached photo of a handwritten chit; any text below is extra)' : 'MESSAGE'}:
"""${text || '(see photo)'}"""

How to read it:
- Hinglish and shorthand are normal: peti/ctn = case or carton, dabba = box, bori = bag, dz = dozen, pkt = packet, lal/red wala sabun = Lifebuoy.
- qty = number of catalogue units (whole number).
- confidence "low" only if the item or quantity is genuinely ambiguous; then give note (max 16 words) and choices (up to 2 candidate quantities) or alt_skus.
- If an item is not in the catalogue, sku = null and item_text = what they called it.
- If they quote a rate, put it in quoted_rate. Never change a rate yourself.
- If the message states a reason for an unusual quantity (a festival, a function, a sale), say so in the flag reason.
- Line flags, only when useful: "new_item" (sku not in this retailer's history), "odd_quantity" (far outside the usual range), "price_mismatch" (quoted rate differs from catalogue). title max 5 words, reason one plain sentence max 24 words with the numbers.
- order_flag: "credit" if there is an overdue balance, else null.

Reply with only JSON in exactly this shape:
{"lines":[{"sku":"LB125","item_text":"lal sabun","qty":6,"heard":"exact words from the order","confidence":"high","note":"","choices":[],"alt_skus":[],"quoted_rate":null,"flag":null}],"order_flag":null}
where flag, when present, is {"type":"odd_quantity","title":"...","reason":"..."}.`;
}

/** Strip code fences and parse. Throws on anything that isn't an object with a lines array. */
export function parseModelJson(text: string): { lines: unknown[]; order_flag?: unknown } {
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b <= a) throw new Error('invalid_json');
  s = s.slice(a, b + 1);
  const v = JSON.parse(s);
  if (!v || typeof v !== 'object' || !Array.isArray(v.lines)) throw new Error('invalid_json');
  return v;
}
