import { CAT } from '../data/seed.js';
import type { Line, Order, Unit } from '../types.js';

export const rs = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const PLURAL: Record<Unit, string> = { case: 'cases', box: 'boxes', bag: 'bags', pkt: 'pkts', carton: 'cartons', dozen: 'dozen', strip: 'strips' };
export const unitStr = (u: Unit, n: number) => (n === 1 ? u : PLURAL[u] ?? u + 's');

export const rateOf = (l: Line) => l.rate ?? (l.sku ? CAT[l.sku].rate : 0);
export const amt = (l: Line) => (l.sku ? rateOf(l) * l.qty : 0);
export const total = (o: Order) => (o.lines || []).reduce((a, l) => a + amt(l), 0);

export const pendingLow = (o: Order) => (o.lines || []).filter((l) => l.sku && l.conf === 'low' && !l.confirmed).length;
export const unmatched = (o: Order) => (o.lines || []).filter((l) => !l.sku).length;
export const openFlags = (o: Order) =>
  (o.lines || []).filter((l) => l.flag && !l.flag.resolved).length + (o.orderFlag && !o.orderFlag.resolved ? 1 : 0);

export const isOpen = (o: Order) => o.status === 'draft' || o.status === 'human';

const needsYou = (l: Line) => (l.flag && !l.flag.resolved) || (l.conf === 'low' && !l.confirmed) || !l.sku;

/** Lines needing attention first; computed once so lines don't jump as flags resolve. */
export function viewOrderFor(o: Order): number[] {
  const pr = (l: Line) => (needsYou(l) ? 1 : 0);
  return o.lines.map((_, i) => i).sort((a, b) => pr(o.lines[b]) - pr(o.lines[a]) || a - b);
}

/** Indexes of lines that need Rajesh right now; stored when the PO screen opens. */
export const attentionFor = (o: Order): number[] => o.lines.map((l, i) => (needsYou(l) ? i : -1)).filter((i) => i >= 0);

const ISSUE: Record<string, string> = { odd_quantity: 'unusual qty', new_item: 'new item', price_mismatch: 'rate differs' };

/** Unresolved line issues, named for a chip: "Surf Excel 1kg · unusual qty". Order-level credit is shown separately. */
export function issuesOf(o: Order): { label: string }[] {
  const order = o.viewOrder ?? o.lines.map((_, i) => i);
  const out: { label: string }[] = [];
  for (const i of order) {
    const l = o.lines[i];
    if (!l) continue;
    const name = l.sku ? CAT[l.sku].short : l.itemText || l.heard;
    if (!l.sku) out.push({ label: `${name} · not in catalogue` });
    else if (l.conf === 'low' && !l.confirmed) out.push({ label: `${name} · unclear` });
    else if (l.flag && !l.flag.resolved) out.push({ label: `${name} · ${ISSUE[l.flag.type] ?? 'check'}` });
  }
  return out;
}
