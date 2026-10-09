import { CAT, RETAILERS } from '../data/seed';
import type { State } from '../state/store';
import type { Channel, Learned, Topic } from '../types';
import { duesOf, invState, invTotal } from './receivables';
import { rs, total } from './money';

// Collates everything the desk knows about one retailer into a profile:
// how they order, how they pay, how risky their credit is, and what was
// learned from Rajesh's decisions. Runs in the background; nothing here
// notifies the user.

export const CHANNEL_LABEL: Record<Channel, string> = { voice: 'Voice notes', chit: 'Chit photos', text: 'WhatsApp texts', call: 'Salesman calls', photo: 'Chit photos' };
export const CHANNEL_MOSTLY: Record<Channel, string> = { voice: 'voice notes', chit: 'chit photos', text: 'WhatsApp texts', call: 'salesman calls', photo: 'chit photos' };

export const TOPICS: { id: Topic; title: string }[] = [
  { id: 'ordering', title: 'How he orders' },
  { id: 'reading', title: 'How he writes and names items' },
  { id: 'pricing', title: 'Pricing' },
  { id: 'credit', title: 'Credit decisions' },
  { id: 'payment', title: 'Payments' },
];

export type Risk = { level: 'good' | 'watch' | 'hold'; label: string; why: string };

export function profileOf(S: Pick<State, 'invoices' | 'orders' | 'learned'>, id: string) {
  const r = RETAILERS[id];
  const invoices = S.invoices.filter((i) => i.retailer === id);
  const todays = S.orders.filter((o) => o.retailer === id);

  // Ordering pattern: 8 weeks of history plus today's orders
  const channels = { ...r.history.channels };
  for (const o of todays) channels[o.channel] = (channels[o.channel] ?? 0) + 1;
  const chTotal = Object.values(channels).reduce((a, n) => a + (n ?? 0), 0) || 1;
  const channelMix = (Object.entries(channels) as [Channel, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([ch, n]) => ({ ch, label: CHANNEL_LABEL[ch], pct: Math.round((100 * n) / chTotal) }));
  const values = [...invoices.map(invTotal), ...todays.filter((o) => o.lines.length && o.status !== 'approved').map(total)];
  const avgOrder = values.length ? values.reduce((a, n) => a + n, 0) / values.length : 0;
  const perWeek = r.history.orders8w / 8;
  const basket = Object.entries(r.usual).map(([sku, [lo, hi]]) => ({ sku, item: CAT[sku], lo, hi }));

  // Payment cycle
  const paid = invoices.filter((i) => i.paidOn).map((i) => ({ inv: i, st: invState(i) }));
  const onTime = paid.filter((p) => p.st.days <= r.terms).length;
  const outstanding = invoices.filter((i) => !i.paidOn).reduce((a, i) => a + invTotal(i), 0);
  const dues = duesOf(S.invoices, id);
  const lastPaid = paid.sort((a, b) => b.inv.paidOn!.localeCompare(a.inv.paidOn!))[0];

  const risk: Risk =
    dues.amount > 0
      ? { level: 'hold', label: 'Overdue: check before shipping', why: `${rs(dues.amount)} overdue, ${dues.days} days past ${r.terms}-day terms. New orders carry the credit flag.` }
      : r.avgPay > r.terms
        ? { level: 'watch', label: 'Slow payer', why: `Takes about ${r.avgPay} days on ${r.terms}-day terms.` }
        : { level: 'good', label: 'Pays on time', why: `Pays in about ${r.avgPay} days, inside ${r.terms}-day terms.` };

  // What the desk learned, grouped by topic, newest first, duplicates collapsed
  const prefix = `${r.name}: `;
  const mine = S.learned.filter((x) => x.retailer === id).slice().reverse();
  const knows = TOPICS.map((t) => {
    const seen = new Map<string, Learned & { times: number }>();
    for (const x of mine.filter((m) => m.topic === t.id)) {
      const text = x.t.startsWith(prefix) ? x.t.slice(prefix.length) : x.t;
      const k = text.toLowerCase();
      const prev = seen.get(k);
      if (prev) prev.times += 1;
      else seen.set(k, { ...x, t: text.charAt(0).toUpperCase() + text.slice(1), times: 1 });
    }
    return { ...t, items: [...seen.values()] };
  }).filter((g) => g.items.length);

  return {
    r,
    ordering: { perWeek, channelMix, avgOrder, basket, today: todays.length },
    payment: { avgDays: r.avgPay, terms: r.terms, paidCount: paid.length, onTime, outstanding, dues, lastPaid },
    risk,
    knows,
    learnedCount: mine.length,
    invoices: invoices.slice().sort((a, b) => b.issued.localeCompare(a.issued)),
    todays,
  };
}

export const perWeekLabel = (n: number) => (n >= 1.75 ? `${Math.round(n)} orders a week` : n >= 0.9 ? 'About once a week' : n >= 0.4 ? 'Every 2 weeks or so' : 'Now and then');
