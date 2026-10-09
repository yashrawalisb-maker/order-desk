import { CAT, PO_SEQ_START, RETAILERS, SEED_LEARNED, SEED_ORDERS } from '../data/seed.js';
import { flagView, orderFlagView } from '../lib/flags.js';
import { rs, total, unitStr, viewOrderFor } from '../lib/money.js';
import type { FlagAction, Learned, Line, Order } from '../types.js';

export type ViewName = 'inbox' | 'live' | 'learned' | 'po' | 'approved' | 'human' | 'done';
export interface View {
  name: ViewName;
  id?: string;
}

export interface Toast {
  id: number;
  t: string;
  head?: string;
  learn?: boolean;
}

export interface LiveForm {
  retailer: string;
  text: string;
  busy: boolean;
  error: string;
}

export interface State {
  view: View;
  orders: Order[];
  learned: Learned[];
  sheet: 'stop' | null;
  toast: Toast | null;
  toastSeq: number;
  /** ms timestamp of the last learning entry; lights the Learn step */
  pulse: number;
  playing: string | null;
  wk: { within: number; total: number };
  money: { leak: number; held: number; asked: number };
  poSeq: number;
  live: LiveForm;
}

export type Action =
  | { type: 'tab'; v: ViewName }
  | { type: 'back' }
  | { type: 'open'; id: string }
  | { type: 'play'; id: string | null }
  | { type: 'qty'; i: number; d: number }
  | { type: 'choose'; i: number; n: number }
  | { type: 'flag'; i: number; k: number }
  | { type: 'oflag'; k: number }
  | { type: 'gap'; k: 'ask' | 'skipgap' }
  | { type: 'pick'; i: number; sku: string }
  | { type: 'drop'; i: number }
  | { type: 'stop' }
  | { type: 'closesheet' }
  | { type: 'stopwhy'; v: string }
  | { type: 'approve' }
  | { type: 'echo'; on: boolean }
  | { type: 'send' }
  | { type: 'handled' }
  | { type: 'callback' }
  | { type: 'reset' }
  | { type: 'clearToast'; id: number }
  | { type: 'live'; patch: Partial<LiveForm> }
  | { type: 'liveAdd'; order: Order };

export const STOP_REASONS = ['Retailer cancelled', 'Duplicate order', 'Call the retailer first', 'Out of stock'];

export const fresh = (): State => ({
  view: { name: 'inbox' },
  orders: structuredClone(SEED_ORDERS),
  learned: structuredClone(SEED_LEARNED),
  sheet: null,
  toast: null,
  toastSeq: 0,
  pulse: 0,
  playing: null,
  wk: { within: 21, total: 25 },
  money: { leak: 2140, held: 0, asked: 0 },
  poSeq: PO_SEQ_START,
  live: { retailer: 'sharma', text: '', busy: false, error: '' },
});

export const nowT = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase();

const R = (o: Order) => RETAILERS[o.retailer];

function toast(S: State, t: string, opts: { head?: string; learn?: boolean } = {}) {
  S.toastSeq += 1;
  S.toast = { id: S.toastSeq, t, ...opts };
}

function learn(S: State, t: string) {
  S.learned.push({ t, at: 'Today, ' + nowT() });
  S.pulse = Date.now();
  toast(S, t, { learn: true, head: 'Learned' });
}

function applyAction(S: State, o: Order, a: FlagAction | { kind: 'ask' | 'skipgap' }, line: Line | null) {
  const r = R(o);
  const c = line?.sku ? CAT[line.sku] : null;
  switch (a.kind) {
    case 'learn':
      line!.flag!.resolved = (a as FlagAction).label;
      learn(S, (a as FlagAction).learn || `${r.name}: ${line!.qty} ${unitStr(c!.unit, line!.qty)} of ${c!.short} can be normal. I’ll widen the usual range.`);
      break;
    case 'setqty': {
      const qty = (a as FlagAction).qty!;
      line!.qty = qty;
      line!.edited = true;
      line!.flag!.resolved = `Changed to ${qty}`;
      learn(S, `${r.name}: you trimmed ${c!.short} back to ${qty}. I’ll keep flagging spikes like this one.`);
      break;
    }
    case 'setsku': {
      const sku = (a as FlagAction).sku!;
      line!.sku = sku;
      line!.flag!.resolved = `Confirmed: ${CAT[sku].name}`;
      learn(S, `${r.name}: “${line!.heard}” means ${CAT[sku].name}.`);
      break;
    }
    case 'setrate': {
      const rate = (a as FlagAction).rate!;
      line!.rate = rate;
      line!.flag!.resolved = `Honouring ${rs(rate)} for this order`;
      learn(S, `${r.name}: you honoured a quoted rate of ${rs(rate)}. I’ll still flag quoted rates every time.`);
      break;
    }
    case 'resolve': {
      const fa = a as FlagAction;
      if (line) line.flag!.resolved = fa.label;
      else o.orderFlag!.resolved = fa.label;
      if (fa.caught) S.money.leak += fa.caught;
      if (fa.learn) learn(S, fa.learn);
      break;
    }
    case 'ask':
      o.gap!.resolved = 'Asking in the WhatsApp echo';
      o.gap!.ask = true;
      S.money.asked += CAT[o.gap!.sku].rate;
      learn(S, `${r.name}: when a usual item is missing, you ask before dispatch. I’ll keep suggesting it.`);
      break;
    case 'skipgap':
      o.gap!.resolved = 'Skipped this time';
      break;
    case 'hold':
      o.status = 'held';
      o.stopReason = 'Call the retailer first';
      S.money.held += total(o);
      S.view = { name: 'inbox' };
      toast(S, `${r.name} is on hold. No PO or invoice went out.`);
      learn(S, `${r.name}: orders on top of overdue dues get held for a call. I’ll raise this flag first next time.`);
      break;
  }
}

function openView(o: Order): View {
  return { name: o.status === 'draft' ? 'po' : o.status === 'human' ? 'human' : 'done', id: o.id };
}

export function reducer(prev: State, a: Action): State {
  if (a.type === 'clearToast') return prev.toast && prev.toast.id === a.id ? { ...prev, toast: null } : prev;
  if (a.type === 'reset') return fresh();

  // Clone, then mutate the clone: keeps the reducer safe under StrictMode double calls.
  const S: State = structuredClone(prev);
  const o = S.view.id ? S.orders.find((x) => x.id === S.view.id) : undefined;
  const line = (i: number) => o!.lines[i];

  switch (a.type) {
    case 'tab':
      S.view = { name: a.v };
      S.playing = null;
      S.sheet = null;
      break;
    case 'back':
      S.view = { name: 'inbox' };
      S.playing = null;
      break;
    case 'open': {
      const t = S.orders.find((x) => x.id === a.id);
      if (!t) break;
      if (t.status === 'draft' && !t.viewOrder) t.viewOrder = viewOrderFor(t);
      S.view = openView(t);
      S.playing = null;
      break;
    }
    case 'play':
      S.playing = a.id;
      break;
    case 'qty': {
      const l = line(a.i);
      const n = Math.max(1, l.qty + a.d);
      if (n !== l.qty) {
        l.qty = n;
        l.edited = true;
      }
      if (l.conf === 'low') l.confirmed = true;
      break;
    }
    case 'choose': {
      const l = line(a.i);
      if (a.n !== l.qty) l.edited = true;
      l.qty = a.n;
      l.confirmed = true;
      const lt = l.learn && l.learn[a.n];
      learn(S, lt || `${R(o!).name}: “${l.heard}” confirmed as ${a.n} ${unitStr(CAT[l.sku!].unit, a.n)}.`);
      break;
    }
    case 'flag': {
      const l = line(a.i);
      const act = flagView(o!, l).actions[a.k];
      if (act) applyAction(S, o!, act, l);
      break;
    }
    case 'oflag': {
      const act = orderFlagView(o!).actions[a.k];
      if (act) applyAction(S, o!, act, null);
      break;
    }
    case 'gap':
      applyAction(S, o!, { kind: a.k }, null);
      break;
    case 'pick': {
      const l = line(a.i);
      l.sku = a.sku;
      l.conf = 'high';
      l.edited = true;
      learn(S, `${R(o!).name}: “${l.itemText || l.heard}” means ${CAT[a.sku].name}.`);
      break;
    }
    case 'drop':
      o!.lines.splice(a.i, 1);
      o!.viewOrder = viewOrderFor(o!);
      break;
    case 'stop':
      S.sheet = 'stop';
      break;
    case 'closesheet':
      S.sheet = null;
      break;
    case 'stopwhy':
      o!.status = a.v === 'Call the retailer first' ? 'held' : 'stopped';
      o!.stopReason = a.v;
      S.sheet = null;
      S.view = { name: 'inbox' };
      toast(S, `Stopped. No PO, invoice or link went to ${R(o!).name}.`);
      break;
    case 'approve':
      if (!o!.poNo) {
        S.poSeq += 1;
        o!.poNo = `PO GD/24-25/${S.poSeq}`;
        o!.invNo = `INV-${2400 + S.poSeq}`;
        o!.payLink = 'rzp.io/rzp/' + Math.random().toString(36).slice(2, 8).padEnd(6, '0');
        o!.echo = true;
      }
      S.view = { name: 'approved', id: o!.id };
      break;
    case 'echo':
      o!.echo = a.on;
      break;
    case 'send': {
      const r = R(o!);
      const edits = o!.lines.filter((l) => l.edited && !(l.flag && l.flag.resolved));
      o!.status = 'approved';
      o!.approvedAt = nowT();
      S.wk.within += 1;
      S.wk.total += 1;
      S.view = { name: 'inbox' };
      toast(S, `Invoice ${o!.invNo} and payment link sent to ${r.name}${o!.echo ? ' with an order echo' : ''}.`, { head: 'Sent on WhatsApp' });
      for (const l of edits) {
        S.learned.push({ t: `${r.name}: you changed ${CAT[l.sku!].short} to ${l.qty} ${unitStr(CAT[l.sku!].unit, l.qty)}. Logged against his usual range.`, at: 'Today, ' + nowT() });
        S.pulse = Date.now();
      }
      break;
    }
    case 'handled':
      o!.status = 'handled';
      S.view = { name: 'inbox' };
      toast(S, `${R(o!).name} marked as handled by hand.`);
      break;
    case 'callback':
      toast(S, `Calling ${R(o!).owner} at ${R(o!).name}…`);
      break;
    case 'live':
      Object.assign(S.live, a.patch);
      break;
    case 'liveAdd':
      a.order.viewOrder = viewOrderFor(a.order);
      S.orders.unshift(a.order);
      S.live = { ...S.live, busy: false, text: '', error: '' };
      S.view = { name: 'po', id: a.order.id };
      break;
  }
  return S;
}
