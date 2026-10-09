import { RETAILERS } from '../data/seed';
import type { State } from '../state/store';
import type { Invoice, Order } from '../types';
import { rs, total } from './money';
import { CHANNEL_MOSTLY, profileOf } from './profile';
import { fmtDate, invRemaining, invState, type InvoiceState } from './receivables';

// Overdue money. Order Desk doesn't chase: Razorpay's recovery agent does that.
// What Order Desk adds is the next order, which can ship against a part-payment,
// and the retailer's payment profile, handed over with the invoice.

export interface OverdueCase {
  inv: Invoice;
  st: InvoiceState;
  remaining: number;
  /** A new order from the same retailer still waiting on the credit decision */
  waiting?: Order;
  /** An order held until part of this invoice is paid */
  held?: Order;
  /** What the recovery agent receives with the invoice */
  pack: string[];
}

type Ledger = Pick<State, 'invoices' | 'orders' | 'learned'>;

const awaitingCredit = (o: Order) => o.status === 'draft' && !!o.orderFlag && !o.orderFlag.resolved;

export function handoffPack(S: Ledger, inv: Invoice): string[] {
  const p = profileOf(S, inv.retailer);
  const lastLate = p.payment.lastPaid && p.payment.lastPaid.st.days > p.payment.terms ? p.payment.lastPaid.st.days - p.payment.terms : 0;
  const lines = [
    `Pays in about ${p.payment.avgDays} days on ${p.payment.terms}-day terms`,
    lastLate ? `Paid his last overdue invoice ${lastLate} days late` : `${p.payment.onTime} of last ${p.payment.paidCount} invoices paid on time`,
    `Orders mostly by ${CHANNEL_MOSTLY[p.ordering.channelMix[0].ch]}; reach ${p.r.owner} on WhatsApp`,
  ];
  const held = S.orders.find((o) => o.release?.invoice === inv.no && o.status === 'held');
  if (held) lines.push(`Has a ${rs(total(held))} order on hold until ${rs(held.release!.amount)} is paid`);
  return lines;
}

export function overdueCases(S: Ledger): OverdueCase[] {
  return S.invoices
    .map((inv) => ({ inv, st: invState(inv) }))
    .filter(({ st }) => st.status === 'late')
    .map(({ inv, st }) => ({
      inv,
      st,
      remaining: invRemaining(inv),
      waiting: S.orders.find((o) => o.retailer === inv.retailer && awaitingCredit(o)),
      held: S.orders.find((o) => o.release?.invoice === inv.no && o.status === 'held'),
      pack: handoffPack(S, inv),
    }))
    .sort((a, b) => b.remaining - a.remaining);
}

/** Overdue invoices nobody is chasing yet: the Dashboard badge. */
export const unhandled = (S: Ledger) => overdueCases(S).filter((c) => !c.inv.handedOff).length;

/** The overdue invoice a held order is released against: the oldest late one. */
export function releaseTarget(S: Ledger, o: Order): Invoice | undefined {
  return S.invoices
    .filter((i) => i.retailer === o.retailer && invState(i).status === 'late')
    .sort((a, b) => a.issued.localeCompare(b.issued))[0];
}

export function releaseOptions(inv: Invoice) {
  const r = invRemaining(inv);
  return [
    { id: 'quarter', label: 'A quarter', amount: Math.round(r / 4) },
    { id: 'half', label: 'Half', amount: Math.round(r / 2) },
    { id: 'all', label: 'All of it', amount: r },
  ];
}

export function releaseMessage(o: Order, inv: Invoice, amount: number): string {
  const r = RETAILERS[o.retailer];
  const st = invState(inv);
  return `Namaste ${r.owner} ji. Your new order (${rs(total(o))}) is ready to go. ${inv.no} from Gupta Distributors, ${rs(invRemaining(inv))}, has been due since ${fmtDate(st.dueOn)}. Pay ${rs(amount)} here and we dispatch your order the same day: ${inv.payLink}`;
}
