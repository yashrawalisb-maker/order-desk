import { fresh, type State } from './store';

// Saves the demo to this browser so orders, invoices and payments survive a reload.
// Storage can be missing or full (private windows, previews); the app works without it.

const KEY = 'orderdesk:v2';

type Saved = Pick<State, 'session' | 'orders' | 'invoices' | 'learned' | 'wk' | 'money' | 'poSeq' | 'dashTab'> & { liveRetailer: string };

export function save(S: State, store: Storage | undefined = globalThis.localStorage): void {
  const data: Saved = {
    session: S.session,
    // Uploaded chit photos are in-memory blob URLs that die with the page; don't keep them.
    orders: S.orders.map((o) => (o.photoUrl?.startsWith('blob:') ? { ...o, photoUrl: null } : o)),
    invoices: S.invoices,
    learned: S.learned,
    wk: S.wk,
    money: S.money,
    poSeq: S.poSeq,
    dashTab: S.dashTab,
    liveRetailer: S.live.retailer,
  };
  try {
    store?.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable or full: keep running in memory */
  }
}

export function load(store: Storage | undefined = globalThis.localStorage): State {
  const base = fresh();
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return base;
    const d = JSON.parse(raw) as Partial<Saved>;
    if (!Array.isArray(d.orders) || !Array.isArray(d.invoices) || !Array.isArray(d.learned)) return base;
    return {
      ...base,
      session: d.session ?? null,
      orders: d.orders,
      invoices: d.invoices,
      learned: d.learned,
      wk: d.wk ?? base.wk,
      money: d.money ?? base.money,
      poSeq: d.poSeq ?? base.poSeq,
      dashTab: d.dashTab ?? base.dashTab,
      live: { ...base.live, retailer: d.liveRetailer ?? base.live.retailer },
    };
  } catch {
    return base;
  }
}
