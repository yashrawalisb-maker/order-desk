import { describe, expect, it } from 'vitest';
import { RETAILERS } from '../src/data/seed';
import { SAMPLES } from '../src/data/samples';
import { fromAI } from '../src/lib/fromAI';
import { minutes, payCard, threadOf } from '../src/lib/messages';
import { invRemaining } from '../src/lib/receivables';
import { fresh, reducer, type Action, type State } from '../src/state/store';

const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s);
const last = (s: State, retailer: string) => threadOf(s.wa, retailer).at(-1)!;

describe('retailer chat', () => {
  it('starts with each seeded order in its retailer’s thread, in time order', () => {
    const s = fresh();
    expect(threadOf(s.wa, 'sharma')).toMatchObject([{ from: 'retailer', kind: 'order', orderId: 'o1' }]);
    expect(threadOf(s.wa, 'patel').map((m) => m.kind)).toEqual(['order', 'invoice']);
    expect(s.wa.map((m) => minutes(m.at))).toEqual([...s.wa.map((m) => minutes(m.at))].sort((a, b) => a - b));
  });

  it('sends the echo and a payable link on Send, then a receipt when paid', () => {
    let s = run(fresh(), { type: 'open', id: 'o1' }, { type: 'approve' }, { type: 'send' });
    const m = last(s, 'sharma');
    expect(m).toMatchObject({ from: 'desk', kind: 'invoice', invNo: 'INV-2519', amount: 17140 });
    expect(m.text).toContain('Total ₹17,140.');
    expect(payCard(s.wa, s.invoices, m)).toMatchObject({ amount: 17140, paid: false });

    s = run(s, { type: 'paid', no: 'INV-2519' });
    expect(payCard(s.wa, s.invoices, m)).toMatchObject({ paid: true });
    expect(last(s, 'sharma')).toMatchObject({ kind: 'receipt', amount: 17140, text: 'Payment received: ₹17,140 for INV-2519. Thank you, Ramesh ji.' });
  });

  it('sends a part-payment request that, once paid in the chat, returns the held order to Rajesh', () => {
    let s = run(fresh(), { type: 'open', id: 'o3' }, { type: 'release', amount: 10575 });
    const ask = last(s, 'newbharat');
    expect(ask).toMatchObject({ kind: 'ask', invNo: 'INV-2496', amount: 10575 });
    expect(payCard(s.wa, s.invoices, ask)).toMatchObject({ amount: 10575, paid: false });

    s = run(s, { type: 'paid', no: 'INV-2496' });
    expect(s.orders.find((o) => o.id === 'o3')!.status).toBe('draft');
    expect(payCard(s.wa, s.invoices, ask)!.paid).toBe(true);
    const inv = s.invoices.find((x) => x.no === 'INV-2496')!;
    expect(last(s, 'newbharat').text).toBe(`Payment received: ₹10,575 for INV-2496. Thank you, Mahesh ji. Your order goes out today.`);
    expect(invRemaining(inv)).toBe(42300 - 10575);
  });

  it('drafts every sample through the same guards as a live reply', () => {
    for (const x of SAMPLES) expect(fromAI(x.reply, RETAILERS[x.retailer]).length).toBeGreaterThan(0);
  });
});
