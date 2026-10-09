import { describe, expect, it } from 'vitest';
import { profileOf } from '../src/lib/profile';
import { fresh, reducer, type Action, type State } from '../src/state/store';

const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s);

describe('retailer profiles', () => {
  it('rates credit risk from the ledger and payment history', () => {
    const s = fresh();
    expect(profileOf(s, 'newbharat').risk.level).toBe('hold');
    expect(profileOf(s, 'sharma').risk.level).toBe('good');
    // Paying the overdue invoice lifts the hold; he is still a slow payer on average.
    expect(profileOf(run(s, { type: 'paid', no: 'INV-2496' }), 'newbharat').risk.level).toBe('watch');
  });

  it('collates the ordering pattern', () => {
    const p = profileOf(fresh(), 'sharma');
    expect(p.ordering.channelMix[0]).toMatchObject({ ch: 'voice', label: 'Voice notes' });
    expect(p.ordering.channelMix.reduce((a, c) => a + c.pct, 0)).toBeGreaterThanOrEqual(99);
    expect(p.ordering.basket.map((b) => b.sku)).toEqual(['LB125', 'PG70', 'TS1', 'SE1', 'VB200']);
    expect(p.payment).toMatchObject({ avgDays: 9, paidCount: 1, onTime: 1 });
  });

  it('files each decision under the retailer and topic, without the name prefix, and collapses repeats', () => {
    let s = run(fresh(), { type: 'open', id: 'o3' }, { type: 'flag', i: 1, k: 0 }, { type: 'oflag', k: 0 });
    const p = profileOf(s, 'newbharat');
    expect(p.knows.map((g) => g.id)).toEqual(['pricing', 'credit', 'payment']);
    expect(p.knows[0].items[0].t).toBe('List rate stands over a quoted rate. ₹160 kept on this order.');
    expect(profileOf(s, 'sharma').knows).toEqual([]);
    s = run(s, { type: 'tab', v: 'inbox' }, { type: 'open', id: 'o3' });
    s.orders.find((o) => o.id === 'o3')!.lines[1].flag!.resolved = null;
    s = run(s, { type: 'flag', i: 1, k: 0 });
    expect(profileOf(s, 'newbharat').knows[0].items[0].times).toBe(2);
  });
});
