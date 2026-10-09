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

/** Lines needing attention first; computed once so lines don't jump as flags resolve. */
export function viewOrderFor(o: Order): number[] {
  const pr = (l: Line) => ((l.flag && !l.flag.resolved) || (l.conf === 'low' && !l.confirmed) || !l.sku ? 1 : 0);
  return o.lines.map((_, i) => i).sort((a, b) => pr(o.lines[b]) - pr(o.lines[a]) || a - b);
}
