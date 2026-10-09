import { CAT, RETAILERS } from '../data/seed.js';
import type { FlagView, Line, Order } from '../types.js';
import { rs, total } from './money.js';

// Flags are built from data at render time so reasons always carry live numbers.

export function flagView(o: Order, l: Line): FlagView {
  const f = l.flag!;
  const r = RETAILERS[o.retailer];
  if (f.type === 'price_mismatch' && !f.reason && l.sku && l.quotedRate) {
    const c = CAT[l.sku];
    const diff = (c.rate - l.quotedRate) * l.qty;
    return {
      title: 'Rate doesn’t match your list',
      reason: `Message says ${rs(l.quotedRate)} a ${c.unit}. Today’s list is ${rs(c.rate)}. That’s ${rs(Math.abs(diff))} on this order.`,
      actions: [
        { label: 'Keep list rate', kind: 'resolve', caught: Math.max(0, diff), learn: `${r.name}: list rate stands over a quoted rate. ${rs(Math.abs(diff))} kept on this order.` },
        { label: `Honour ${rs(l.quotedRate)}`, kind: 'setrate', rate: l.quotedRate },
      ],
    };
  }
  return { title: f.title ?? 'Worth a look', reason: f.reason ?? '', actions: f.actions ?? [] };
}

export function orderFlagView(o: Order): FlagView {
  const r = RETAILERS[o.retailer];
  return {
    title: 'Already overdue',
    reason: `${rs(r.overdue)} overdue for ${r.overdueDays} days on ${r.terms}-day terms. This order adds ${rs(total(o))}.`,
    actions: [
      { label: 'Ship anyway', kind: 'resolve', learn: `${r.name}: you shipped despite overdue dues. I’ll keep showing the balance on every order.` },
      { label: 'Hold and call', kind: 'hold' },
    ],
    red: true,
  };
}
