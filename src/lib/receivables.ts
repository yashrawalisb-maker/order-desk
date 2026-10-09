import { CAT, RETAILERS, daysAgo } from '../data/seed';
import type { Invoice, InvoiceLine } from '../types';

export const today = () => daysAgo(0);

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
export const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  return daysAgo(-n, d);
};
export const fmtDate = (iso: string) => toDate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShort = (iso: string) => toDate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const invTotal = (inv: { lines: InvoiceLine[] }) => inv.lines.reduce((a, l) => a + l.rate * l.qty, 0);

export type PayStatus = 'paid' | 'late' | 'due';

export interface InvoiceState {
  status: PayStatus;
  dueOn: string;
  /** days late (late), days left (due), days taken to pay (paid) */
  days: number;
}

export function invState(inv: Invoice, on = today()): InvoiceState {
  const terms = RETAILERS[inv.retailer].terms;
  const dueOn = addDays(inv.issued, terms);
  if (inv.paidOn) return { status: 'paid', dueOn, days: daysBetween(inv.issued, inv.paidOn) };
  const late = daysBetween(dueOn, on);
  return late > 0 ? { status: 'late', dueOn, days: late } : { status: 'due', dueOn, days: -late };
}

export function statusLabel(st: InvoiceState): string {
  if (st.status === 'paid') return `Paid in ${st.days} day${st.days === 1 ? '' : 's'}`;
  if (st.status === 'late') return `${st.days} day${st.days === 1 ? '' : 's'} late`;
  return st.days === 0 ? 'Due today' : `Due in ${st.days} day${st.days === 1 ? '' : 's'}`;
}

/** Overdue balance for a retailer, and how far past terms the oldest unpaid invoice is. */
export function duesOf(invoices: Invoice[], retailer: string, on = today()): { amount: number; days: number } {
  let amount = 0;
  let days = 0;
  for (const inv of invoices) {
    if (inv.retailer !== retailer) continue;
    const st = invState(inv, on);
    if (st.status === 'late') {
      amount += invTotal(inv);
      days = Math.max(days, st.days);
    }
  }
  return { amount, days };
}

export const BUCKETS = [
  { id: 'current', label: 'Not yet due' },
  { id: 'b1', label: '1–15 days late' },
  { id: 'b2', label: '16–30 days late' },
  { id: 'b3', label: 'Over 30 days late' },
] as const;
export type BucketId = (typeof BUCKETS)[number]['id'];

export function bucketOf(st: InvoiceState): BucketId | null {
  if (st.status === 'paid') return null;
  if (st.status === 'due') return 'current';
  return st.days <= 15 ? 'b1' : st.days <= 30 ? 'b2' : 'b3';
}

export function receivables(invoices: Invoice[], on = today()) {
  const aging: Record<BucketId, { amount: number; count: number }> = {
    current: { amount: 0, count: 0 }, b1: { amount: 0, count: 0 }, b2: { amount: 0, count: 0 }, b3: { amount: 0, count: 0 },
  };
  let outstanding = 0, outCount = 0, overdue = 0, overCount = 0, collected7 = 0, paidDays = 0, paidCount = 0;
  for (const inv of invoices) {
    const st = invState(inv, on);
    const amt = invTotal(inv);
    const b = bucketOf(st);
    if (b) {
      aging[b].amount += amt;
      aging[b].count += 1;
      outstanding += amt;
      outCount += 1;
      if (st.status === 'late') {
        overdue += amt;
        overCount += 1;
      }
    } else {
      paidDays += st.days;
      paidCount += 1;
      if (daysBetween(inv.paidOn!, on) <= 7) collected7 += amt;
    }
  }
  return { outstanding, outCount, overdue, overCount, collected7, avgDays: paidCount ? paidDays / paidCount : 0, paidCount, aging };
}

/** Back-calculate taxable value and CGST/SGST from GST-inclusive line amounts (intra-state supply). */
export function taxLines(lines: InvoiceLine[]) {
  const rows = lines.map((l) => {
    const c = CAT[l.sku];
    const amount = l.rate * l.qty;
    const taxable = Math.round((amount / (1 + c.gst / 100)) * 100) / 100;
    const tax = Math.round((amount - taxable) * 100) / 100;
    return { ...l, c, amount, taxable, cgst: tax / 2, sgst: tax / 2 };
  });
  const sum = (k: 'amount' | 'taxable' | 'cgst' | 'sgst') => rows.reduce((a, r) => a + r[k], 0);
  return { rows, amount: sum('amount'), taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst') };
}

export const rs2 = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
const three = (n: number) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n));

/** Indian numbering: 1,23,45,678 -> "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight" */
export function amountInWords(n: number): string {
  n = Math.round(n);
  if (n === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7), lakh = Math.floor((n % 1e7) / 1e5), thousand = Math.floor((n % 1e5) / 1e3), rest = n % 1e3;
  if (crore) parts.push(three(crore) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (thousand) parts.push(two(thousand) + ' Thousand');
  if (rest) parts.push(three(rest));
  return 'Rupees ' + parts.join(' ') + ' Only';
}
