import { CAT, RETAILERS, SEED_ORDERS } from '../data/seed.js';
import type { Invoice, Order, WaMsg } from '../types.js';
import { rs, total, unitStr } from './money.js';
import { invRemaining } from './receivables.js';

// The retailer's WhatsApp thread with Gupta Distributors. Orders go in; the
// invoice, payment link, part-payment requests and receipts come back. None of
// the outgoing messages are AI: they are templates filled from the ledger.

export function echoText(o: Order): string {
  const r = RETAILERS[o.retailer];
  const items = o.lines.map((l) => `• ${CAT[l.sku!].short} × ${l.qty} ${unitStr(CAT[l.sku!].unit, l.qty)}`).join('\n');
  const ask = o.gap && o.gap.ask ? `\n${CAT[o.gap.sku].short} bhi bhejein? It’s usually in your weekly order.` : '';
  return `Namaste ${r.owner} ji. Your order with Gupta Distributors:\n${items}\nTotal ${rs(total(o))}. Pay here: ${o.payLink}${ask}\nAnything wrong? Reply before 4 pm dispatch.`;
}

/** What goes out on Send: the echo when it's on, else just the invoice and link. */
export const invoiceText = (o: Order): string =>
  o.echo ? echoText(o) : `Namaste ${RETAILERS[o.retailer].owner} ji. Invoice ${o.invNo} from Gupta Distributors, ${rs(total(o))}. Pay here: ${o.payLink}`;

export function receiptText(inv: Invoice, amount: number, released: boolean): string {
  const r = RETAILERS[inv.retailer];
  const left = invRemaining(inv);
  const tail = released ? ' Your order goes out today.' : left > 0 ? ` ${rs(left)} still due on this invoice.` : '';
  return `Payment received: ${rs(amount)} for ${inv.no}. Thank you, ${r.owner} ji.${tail}`;
}

/** "9:12 am" to minutes since midnight, for ordering the seeded thread. */
export function minutes(at: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(at.trim());
  if (!m) return 0;
  return ((Number(m[1]) % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0)) * 60 + Number(m[2]);
}

/** Today's messages before the demo starts: each seeded order, and the invoice for the one already sent. */
export function seedThread(): WaMsg[] {
  const out: Omit<WaMsg, 'id'>[] = [];
  for (const o of SEED_ORDERS) {
    out.push({ retailer: o.retailer, from: 'retailer', at: o.at, kind: 'order', orderId: o.id });
    if (o.status === 'approved' && o.approvedAt) {
      out.push({ retailer: o.retailer, from: 'desk', at: o.approvedAt, kind: 'invoice', orderId: o.id, invNo: o.invNo!, text: invoiceText(o) });
    }
  }
  return out.sort((a, b) => minutes(a.at) - minutes(b.at)).map((m, i) => ({ ...m, id: i + 1 }));
}

export const threadOf = (wa: WaMsg[], retailer: string) => wa.filter((m) => m.retailer === retailer);

/** The payment card under a desk message: what the retailer can pay now, or that it's paid. */
export function payCard(wa: WaMsg[], invoices: Invoice[], m: WaMsg): { link: string; amount: number; paid: boolean } | null {
  if (m.kind !== 'invoice' && m.kind !== 'ask') return null;
  const inv = invoices.find((x) => x.no === m.invNo);
  if (!inv) return null;
  const req = inv.request?.kind === 'partial' && !inv.request.fulfilledOn ? inv.request : null;
  if (m.kind === 'ask') {
    // Only the latest request on an invoice is payable; earlier ones were met or replaced.
    const latest = [...wa].reverse().find((x) => x.kind === 'ask' && x.invNo === inv.no);
    const open = !inv.paidOn && !!req && latest?.id === m.id;
    return { link: inv.payLink, amount: open ? Math.min(req!.amount!, invRemaining(inv)) : m.amount ?? 0, paid: !open };
  }
  const left = invRemaining(inv);
  return { link: inv.payLink, amount: inv.paidOn ? m.amount ?? 0 : req ? Math.min(req.amount!, left) : left, paid: !!inv.paidOn };
}
