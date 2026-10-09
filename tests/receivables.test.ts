import { describe, expect, it } from 'vitest';
import { orderFlagView } from '../src/lib/flags';
import { amountInWords, duesOf, invState, invTotal, receivables, taxLines, today } from '../src/lib/receivables';
import { load, save } from '../src/state/persist';
import { fresh, reducer, type Action, type State } from '../src/state/store';

const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s);

class MemStore {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('seeded ledger', () => {
  it('matches the PRD: New Bharat ₹42,300 overdue 38 days', () => {
    const s = fresh();
    expect(duesOf(s.invoices, 'newbharat')).toEqual({ amount: 42300, days: 38 });
    expect(duesOf(s.invoices, 'sharma').amount).toBe(0);
    const o3 = s.orders.find((o) => o.id === 'o3')!;
    expect(orderFlagView(o3, duesOf(s.invoices, 'newbharat')).reason).toBe('₹42,300 overdue for 38 days on 21-day terms. This order adds ₹10,665.');
  });

  it('agrees with the Learned seeds', () => {
    const s = fresh();
    const inv = (no: string) => s.invoices.find((x) => x.no === no)!;
    expect(invState(inv('INV-2512'))).toMatchObject({ status: 'paid', days: 4 });
    expect(inv('INV-2511').po).toBe('PO GD/24-25/112');
    expect(invState(inv('INV-2511')).days - 21).toBe(19);
    expect(inv('INV-2518').orderId).toBe('o5');
  });

  it('adds up the dashboard', () => {
    const R = receivables(fresh().invoices);
    expect(R.overdue).toBe(42300);
    expect(R.aging.b3).toEqual({ amount: 42300, count: 1 });
    expect(R.aging.current.count).toBe(3);
    expect(R.outstanding).toBe(42300 + 6280 + 4980 + 12872);
    expect(R.collected7).toBe(7000 + 10820 + 6232 + 16922 + 3040);
    expect(R.avgDays).toBeCloseTo((4 + 40 + 12 + 9 + 18) / 5);
  });
});

describe('tax invoice maths', () => {
  it('splits GST-inclusive amounts into taxable value, CGST and SGST', () => {
    const t = taxLines([{ sku: 'SE1', qty: 20, rate: 118 }, { sku: 'TS1', qty: 2, rate: 610 }]);
    expect(t.rows[0]).toMatchObject({ amount: 2360, taxable: 2000, cgst: 180, sgst: 180 });
    expect(t.rows[1]).toMatchObject({ amount: 1220, taxable: 1220, cgst: 0 });
    expect(t.taxable + t.cgst + t.sgst).toBeCloseTo(t.amount, 2);
  });

  it('writes amounts in Indian words', () => {
    expect(amountInWords(17140)).toBe('Rupees Seventeen Thousand One Hundred Forty Only');
    expect(amountInWords(42300)).toBe('Rupees Forty Two Thousand Three Hundred Only');
    expect(amountInWords(12345678)).toBe('Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only');
  });
});

describe('end to end: login, approve, send, get paid', () => {
  it('runs the whole flow', () => {
    let s = run(fresh(), { type: 'login', phone: '9826012345' });
    expect(s.session?.name).toBe('Rajesh Gupta');

    s = run(s, { type: 'open', id: 'o1' }, { type: 'approve' }, { type: 'send' });
    const inv = s.invoices.find((x) => x.no === 'INV-2519')!;
    expect(inv).toMatchObject({ po: 'PO GD/24-25/119', retailer: 'sharma', orderId: 'o1', issued: today(), paidOn: null });
    expect(invTotal(inv)).toBe(17140);
    expect(receivables(s.invoices).aging.current.count).toBe(4);

    s = run(s, { type: 'paid', no: 'INV-2519' });
    expect(invState(s.invoices.find((x) => x.no === 'INV-2519')!)).toMatchObject({ status: 'paid', days: 0 });
    expect(s.learned.at(-1)).toMatchObject({ outcome: true, t: 'Sharma Kirana Store paid INV-2519 in 0 days through the Razorpay link. Reconciled in Tally; his lines keep approving untouched.' });
  });

  it('clears New Bharat’s dues when the overdue invoice is paid', () => {
    const s = run(fresh(), { type: 'paid', no: 'INV-2496' });
    expect(duesOf(s.invoices, 'newbharat').amount).toBe(0);
    expect(s.learned.at(-1)?.t).toContain('paid INV-2496 38 days late');
  });

  it('navigates back through a stack and resets it on tab switches', () => {
    let s = run(fresh(), { type: 'tab', v: 'dash' }, { type: 'go', view: { name: 'retailer', id: 'patel' } }, { type: 'go', view: { name: 'invoice', id: 'INV-2518' } });
    s = run(s, { type: 'back' });
    expect(s.view).toEqual({ name: 'retailer', id: 'patel' });
    s = run(s, { type: 'back' });
    expect(s.view).toEqual({ name: 'dash' });
    s = run(s, { type: 'tab', v: 'retailers' });
    expect(s.stack).toEqual([]);
  });

  it('signs out but keeps the data; reset keeps the session', () => {
    let s = run(fresh(), { type: 'login', phone: '9826012345' }, { type: 'paid', no: 'INV-2518' });
    s = run(s, { type: 'reset' });
    expect(s.session).not.toBeNull();
    expect(s.invoices.find((x) => x.no === 'INV-2518')!.paidOn).toBeNull();
    s = run(s, { type: 'logout' });
    expect(s.session).toBeNull();
  });
});

describe('persistence', () => {
  it('round-trips through storage and drops dead photo URLs', () => {
    const store = new MemStore() as unknown as Storage;
    let s = run(fresh(), { type: 'login', phone: '9826012345' }, { type: 'open', id: 'o1' }, { type: 'approve' }, { type: 'send' });
    s.orders[0].photoUrl = 'blob:http://x/1';
    save(s, store);
    const back = load(store);
    expect(back.session).toEqual(s.session);
    expect(back.invoices.map((x) => x.no)).toEqual(s.invoices.map((x) => x.no));
    expect(back.orders.find((o) => o.id === 'o1')!.status).toBe('approved');
    expect(back.orders[0].photoUrl).toBeNull();
    expect(back.view).toEqual({ name: 'inbox' });
  });

  it('falls back to a fresh demo on missing or corrupt data', () => {
    const store = new MemStore();
    expect(load(store as unknown as Storage).orders).toHaveLength(5);
    store.setItem('orderdesk:v2', '{not json');
    expect(load(store as unknown as Storage).session).toBeNull();
    expect(load(undefined).orders).toHaveLength(5);
  });
});
