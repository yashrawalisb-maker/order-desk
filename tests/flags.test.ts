import { describe, expect, it } from 'vitest';
import { flagView, orderFlagView } from '../src/lib/flags';
import { rs, total } from '../src/lib/money';
import { echoText } from '../src/screens/Approved';
import { fresh, reducer, type Action, type State } from '../src/state/store';

const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s);
const order = (s: State, id: string) => s.orders.find((o) => o.id === id)!;

describe('seeded numbers (PRD section 11)', () => {
  it('opens with ₹2,140 protected, 84%, four open and Patel done', () => {
    const s = fresh();
    expect(rs(s.money.leak + s.money.held)).toBe('₹2,140');
    expect(Math.round((100 * s.wk.within) / s.wk.total)).toBe(84);
    expect(s.orders.filter((o) => o.status === 'draft' || o.status === 'human')).toHaveLength(4);
    expect(order(s, 'o5').status).toBe('approved');
  });

  it('computes the New Bharat credit and price flags', () => {
    const o3 = order(fresh(), 'o3');
    expect(total(o3)).toBe(10665);
    expect(orderFlagView(o3).reason).toBe('₹42,300 overdue for 38 days on 21-day terms. This order adds ₹10,665.');
    expect(flagView(o3, o3.lines[1]).reason).toBe('Message says ₹1,840 a case. Today’s list is ₹1,920. That’s ₹160 on this order.');
  });

  it('recomputes the credit amount when a quantity changes', () => {
    const s = run(fresh(), { type: 'open', id: 'o3' }, { type: 'qty', i: 0, d: 1 });
    expect(orderFlagView(order(s, 'o3')).reason).toContain('This order adds ₹11,120.');
  });
});

describe('Sharma flow', () => {
  it('learns, asks in the echo, approves and sends', () => {
    let s = run(fresh(), { type: 'open', id: 'o1' });
    expect(s.view).toEqual({ name: 'po', id: 'o1' });
    expect(order(s, 'o1').viewOrder).toEqual([3, 0, 1, 2]);

    s = run(s, { type: 'flag', i: 3, k: 0 });
    expect(order(s, 'o1').lines[3].flag?.resolved).toBe('Normal for Diwali');
    expect(s.learned.at(-1)?.t).toBe('Sharma Kirana stocks up about 2x in festival weeks. I’ll stay quiet on Surf next Diwali.');
    expect(s.toast).toMatchObject({ head: 'Learned', learn: true });

    s = run(s, { type: 'gap', k: 'ask' }, { type: 'approve' });
    const o = order(s, 'o1');
    expect(s.view.name).toBe('approved');
    expect(o.poNo).toBe('PO GD/24-25/119');
    expect(o.invNo).toBe('INV-2519');
    expect(o.payLink).toMatch(/^rzp\.io\/rzp\/[a-z0-9]{6}$/);
    expect(echoText(o)).toContain('Total ₹17,140.');
    expect(echoText(o)).toContain('Vim bar 200g bhi bhejein? It’s usually in your weekly order.');

    s = run(s, { type: 'send' });
    expect(order(s, 'o1').status).toBe('approved');
    expect(Math.round((100 * s.wk.within) / s.wk.total)).toBe(85); // 22/26
    expect(s.money.asked).toBe(1080);
    expect(s.toast?.t).toBe('Invoice INV-2519 and payment link sent to Sharma Kirana Store with an order echo.');
  });

  it('keeps the payment link stable across back and re-approve', () => {
    let s = run(fresh(), { type: 'open', id: 'o1' }, { type: 'approve' });
    const link = order(s, 'o1').payLink;
    s = run(s, { type: 'open', id: 'o1' }, { type: 'approve' });
    expect(order(s, 'o1').payLink).toBe(link);
    expect(order(s, 'o1').poNo).toBe('PO GD/24-25/119');
  });
});

describe('Balaji flow', () => {
  it('blocks approval until the smudged digit is confirmed', () => {
    let s = run(fresh(), { type: 'open', id: 'o2' });
    const i = order(s, 'o2').lines.findIndex((l) => l.sku === 'CPS');
    s = run(s, { type: 'choose', i, n: 8 });
    expect(order(s, 'o2').lines[i]).toMatchObject({ qty: 8, confirmed: true });
    expect(s.learned.at(-1)?.t).toBe('Balaji writes his 8s like 3s. I’ll read them against his usual range from now on.');
  });

  it('swaps Dettol to the liquid', () => {
    let s = run(fresh(), { type: 'open', id: 'o2' }, { type: 'flag', i: 3, k: 1 });
    expect(order(s, 'o2').lines[3].sku).toBe('DL125');
    expect(s.learned.at(-1)?.t).toBe('Balaji General Store: “Dettol 125 - 1 ctn” means Dettol antiseptic liquid 125ml.');
  });
});

describe('New Bharat flow', () => {
  it('keep list rate adds ₹160; hold adds the order total', () => {
    let s = run(fresh(), { type: 'open', id: 'o3' }, { type: 'flag', i: 1, k: 0 });
    expect(s.money.leak).toBe(2300);
    expect(s.learned.at(-1)?.t).toBe('New Bharat Traders: list rate stands over a quoted rate. ₹160 kept on this order.');
    s = run(s, { type: 'oflag', k: 1 });
    expect(order(s, 'o3')).toMatchObject({ status: 'held', stopReason: 'Call the retailer first' });
    expect(s.money.held).toBe(10665);
    expect(s.view.name).toBe('inbox');
  });
});

describe('Stop, failure and reset', () => {
  it('stop creates no PO', () => {
    const s = run(fresh(), { type: 'open', id: 'o1' }, { type: 'stop' }, { type: 'stopwhy', v: 'Duplicate order' });
    expect(order(s, 'o1')).toMatchObject({ status: 'stopped', stopReason: 'Duplicate order' });
    expect(order(s, 'o1').poNo).toBeUndefined();
    expect(s.toast?.t).toBe('Stopped. No PO, invoice or link went to Sharma Kirana Store.');
  });

  it('marks the unreadable order handled', () => {
    const s = run(fresh(), { type: 'open', id: 'o4' }, { type: 'handled' });
    expect(order(s, 'o4').status).toBe('handled');
  });

  it('reset restores the seed and does not leak mutations into it', () => {
    const s = run(fresh(), { type: 'open', id: 'o1' }, { type: 'qty', i: 0, d: 3 }, { type: 'reset' });
    expect(s).toEqual(fresh());
    expect(order(fresh(), 'o1').lines[0].qty).toBe(5);
  });
});
