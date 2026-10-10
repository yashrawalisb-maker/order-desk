import { describe, expect, it } from 'vitest';
import { orderFlagView } from '../src/lib/flags';
import { overdueCases, releaseOptions, unhandled } from '../src/lib/overdue';
import { profileOf } from '../src/lib/profile';
import { duesOf, invRemaining, invState, receivables } from '../src/lib/receivables';
import { fresh, reducer, type Action, type State } from '../src/state/store';

const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s);
const inv = (s: State, no: string) => s.invoices.find((x) => x.no === no)!;
const ord = (s: State, id: string) => s.orders.find((x) => x.id === id)!;

describe('overdue: use the next order, hand off the chasing', () => {
  it('finds New Bharat as the only overdue case, with his waiting order and a hand-off pack', () => {
    const cases = overdueCases(fresh());
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({ remaining: 42300, waiting: { id: 'o3' } });
    expect(cases[0].pack).toContain('Paid his last overdue invoice 19 days late');
    expect(unhandled(fresh())).toBe(1);
  });

  it('offers to ship the order against a part-payment', () => {
    const o3 = ord(fresh(), 'o3');
    const f = orderFlagView(o3, duesOf(fresh().invoices, 'newbharat'));
    expect(f.actions.map((a) => a.label)).toEqual(['Ship anyway', 'Hold and call', 'Ship when ₹21,150 is paid']);
    expect(releaseOptions(inv(fresh(), 'INV-2496')).map((x) => x.amount)).toEqual([10575, 21150, 42300]);
  });

  it('holds the order, sends the link, and releases it once paid', () => {
    let s = run(fresh(), { type: 'open', id: 'o3' }, { type: 'oflag', k: 2 });
    expect(s.sheet).toBe('release');
    s = run(s, { type: 'release', amount: 21150 });
    expect(ord(s, 'o3')).toMatchObject({ status: 'held', stopReason: 'Ships when ₹21,150 is paid', release: { invoice: 'INV-2496', amount: 21150 } });
    expect(inv(s, 'INV-2496').request).toMatchObject({ kind: 'partial', amount: 21150 });
    expect(s.toast).toMatchObject({ head: 'Sent on WhatsApp' });
    expect(s.learned.at(-1)).toMatchObject({ retailer: 'newbharat', topic: 'credit' });

    s = run(s, { type: 'paid', no: 'INV-2496' });
    expect(invRemaining(inv(s, 'INV-2496'))).toBe(21150);
    expect(invState(inv(s, 'INV-2496')).status).toBe('late');
    expect(duesOf(s.invoices, 'newbharat').amount).toBe(21150);
    expect(receivables(s.invoices).recovered7).toBe(10820 + 21150);
    expect(ord(s, 'o3').status).toBe('draft');
    expect(ord(s, 'o3').orderFlag?.resolved).toMatch(/^₹21,150 received .*Ready to approve\.$/);
    expect(s.toast?.t).toBe('₹21,150 received from New Bharat Traders. Their ₹10,665 order is back in Needs you, ready to approve.');

    // Rajesh still approves; the rest is paid later in full.
    s = run(s, { type: 'tab', v: 'inbox' }, { type: 'open', id: 'o3' }, { type: 'approve' }, { type: 'send' });
    expect(ord(s, 'o3').status).toBe('approved');
    s = run(s, { type: 'paid', no: 'INV-2496' });
    expect(inv(s, 'INV-2496').paidOn).toBeTruthy();
    expect(inv(s, 'INV-2496').payments!.map((p) => p.amount)).toEqual([21150, 21150]);
    expect(profileOf(s, 'newbharat').risk.level).toBe('watch');
  });

  it('hands the invoice to Razorpay’s recovery agent once', () => {
    let s = run(fresh(), { type: 'handoff', no: 'INV-2496' });
    expect(inv(s, 'INV-2496').handedOff).toBeTruthy();
    expect(unhandled(s)).toBe(0);
    expect(s.toast?.head).toBe('Handed off');
    const n = s.learned.length;
    s = run(s, { type: 'handoff', no: 'INV-2496' });
    expect(s.learned.length).toBe(n);
  });
});

describe('navigation', () => {
  it('An order sent from the retailer chat stays in the chat; Back from the draft returns there', () => {
    const order = { id: 'L1', retailer: 'sharma', channel: 'text' as const, at: '5:00 pm', status: 'draft' as const, live: true, raw: 'x', lines: [] };
    let s = run(fresh(), { type: 'go', view: { name: 'chat' } }, { type: 'liveAdd', order });
    expect(s.view).toEqual({ name: 'chat' });
    s = run(s, { type: 'open', id: 'L1' }, { type: 'back' });
    expect(s.view).toEqual({ name: 'chat' });
    s = run(s, { type: 'back' });
    expect(s.view).toEqual({ name: 'inbox' });
  });
});
