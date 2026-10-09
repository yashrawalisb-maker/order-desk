import { CAT, PO_SEQ_START, RETAILERS, SEED_LEARNED, SEED_ORDERS, seedInvoices } from '../data/seed.js';
import { flagView, orderFlagView } from '../lib/flags.js';
import { rateOf, rs, total, unitStr, viewOrderFor } from '../lib/money.js';
import { releaseTarget } from '../lib/overdue.js';
import { daysBetween, duesOf, fmtShort, invRemaining, invState, invTotal, today } from '../lib/receivables.js';
import type { FlagAction, Invoice, Learned, Line, Order, Session, Topic } from '../types.js';

export type ViewName =
  | 'inbox' | 'live' | 'dash' | 'retailers' | 'history'
  | 'po' | 'approved' | 'human' | 'done' | 'retailer' | 'invoice';
export interface View {
  name: ViewName;
  id?: string;
}
export const TAB_ROOTS: ViewName[] = ['inbox', 'live', 'dash', 'retailers', 'history'];

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

/** A printable document: from a saved invoice, or straight from an approved order before Send. */
export type DocRef = { kind: 'po' | 'invoice'; invoice?: string; order?: string };

export interface State {
  session: Session | null;
  view: View;
  /** Views to go back to; cleared on tab switches */
  stack: View[];
  orders: Order[];
  invoices: Invoice[];
  learned: Learned[];
  sheet: 'stop' | 'profile' | 'release' | null;
  doc: DocRef | null;
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
  | { type: 'login'; phone: string }
  | { type: 'logout' }
  | { type: 'tab'; v: ViewName }
  | { type: 'back' }
  | { type: 'go'; view: View }
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
  | { type: 'profile' }
  | { type: 'closesheet' }
  | { type: 'stopwhy'; v: string }
  | { type: 'approve' }
  | { type: 'echo'; on: boolean }
  | { type: 'send' }
  | { type: 'handled' }
  | { type: 'callback' }
  | { type: 'paid'; no: string }
  | { type: 'release'; amount: number }
  | { type: 'handoff'; no: string }
  | { type: 'doc'; doc: DocRef | null }
  | { type: 'reset' }
  | { type: 'clearToast'; id: number }
  | { type: 'live'; patch: Partial<LiveForm> }
  | { type: 'liveAdd'; order: Order };

export const STOP_REASONS = ['Retailer cancelled', 'Duplicate order', 'Call the retailer first', 'Out of stock'];

export const fresh = (): State => ({
  session: null,
  view: { name: 'inbox' },
  stack: [],
  orders: structuredClone(SEED_ORDERS),
  invoices: seedInvoices(),
  learned: structuredClone(SEED_LEARNED),
  sheet: null,
  doc: null,
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

/** Record what the desk learned against the retailer's profile. Silent: no toast. */
function learn(S: State, retailer: string, topic: Topic, t: string, outcome = false) {
  S.learned.push({ t, at: 'Today, ' + nowT(), retailer, topic, ...(outcome ? { outcome: true } : {}) });
  S.pulse = Date.now();
}

function go(S: State, view: View) {
  S.stack.push(S.view);
  S.view = view;
  S.playing = null;
  S.sheet = null;
}

function home(S: State) {
  S.view = { name: 'inbox' };
  S.stack = [];
  S.playing = null;
}

function applyAction(S: State, o: Order, a: FlagAction | { kind: 'ask' | 'skipgap' }, line: Line | null) {
  const r = R(o);
  const c = line?.sku ? CAT[line.sku] : null;
  switch (a.kind) {
    case 'learn':
      line!.flag!.resolved = (a as FlagAction).label;
      learn(S, o.retailer, 'ordering', (a as FlagAction).learn || `${r.name}: ${line!.qty} ${unitStr(c!.unit, line!.qty)} of ${c!.short} can be normal. I’ll widen the usual range.`);
      break;
    case 'setqty': {
      const qty = (a as FlagAction).qty!;
      line!.qty = qty;
      line!.edited = true;
      line!.flag!.resolved = `Changed to ${qty}`;
      learn(S, o.retailer, 'ordering', `${r.name}: you trimmed ${c!.short} back to ${qty}. I’ll keep flagging spikes like this one.`);
      break;
    }
    case 'setsku': {
      const sku = (a as FlagAction).sku!;
      line!.sku = sku;
      line!.flag!.resolved = `Confirmed: ${CAT[sku].name}`;
      learn(S, o.retailer, 'reading', `${r.name}: “${line!.heard}” means ${CAT[sku].name}.`);
      break;
    }
    case 'setrate': {
      const rate = (a as FlagAction).rate!;
      line!.rate = rate;
      line!.flag!.resolved = `Honouring ${rs(rate)} for this order`;
      learn(S, o.retailer, 'pricing', `${r.name}: you honoured a quoted rate of ${rs(rate)}. I’ll still flag quoted rates every time.`);
      break;
    }
    case 'resolve': {
      const fa = a as FlagAction;
      if (line) line.flag!.resolved = fa.label;
      else o.orderFlag!.resolved = fa.label;
      if (fa.caught) S.money.leak += fa.caught;
      const topic: Topic = !line ? 'credit' : line.flag!.type === 'price_mismatch' ? 'pricing' : 'ordering';
      if (fa.learn) learn(S, o.retailer, topic, fa.learn);
      break;
    }
    case 'ask':
      o.gap!.resolved = 'Asking in the WhatsApp echo';
      o.gap!.ask = true;
      S.money.asked += CAT[o.gap!.sku].rate;
      learn(S, o.retailer, 'ordering', `${r.name}: when a usual item is missing, you ask before dispatch. I’ll keep suggesting it.`);
      break;
    case 'skipgap':
      o.gap!.resolved = 'Skipped this time';
      break;
    case 'release':
      // Choose the part-payment amount in a sheet first; see the 'release' action.
      S.sheet = 'release';
      break;
    case 'hold':
      o.status = 'held';
      o.stopReason = 'Call the retailer first';
      S.money.held += total(o);
      home(S);
      toast(S, `${r.name} is on hold. No PO or invoice went out.`);
      learn(S, o.retailer, 'credit', `${r.name}: orders on top of overdue dues get held for a call. I’ll raise this flag first next time.`);
      break;
  }
}

function openView(o: Order): View {
  return { name: o.status === 'draft' ? 'po' : o.status === 'human' ? 'human' : 'done', id: o.id };
}

export function reducer(prev: State, a: Action): State {
  if (a.type === 'clearToast') return prev.toast && prev.toast.id === a.id ? { ...prev, toast: null } : prev;
  if (a.type === 'reset') return { ...fresh(), session: prev.session };

  // Clone, then mutate the clone: keeps the reducer safe under StrictMode double calls.
  const S: State = structuredClone(prev);
  const o = S.view.id ? S.orders.find((x) => x.id === S.view.id) : undefined;
  const line = (i: number) => o!.lines[i];

  switch (a.type) {
    case 'login':
      S.session = { phone: a.phone, name: 'Rajesh Gupta' };
      home(S);
      toast(S, 'Signed in as Rajesh Gupta, Gupta Distributors.');
      break;
    case 'logout':
      S.session = null;
      S.sheet = null;
      home(S);
      break;
    case 'tab':
      S.view = { name: a.v };
      S.stack = [];
      S.playing = null;
      S.sheet = null;
      break;
    case 'back':
      S.view = S.stack.pop() ?? { name: 'inbox' };
      S.playing = null;
      break;
    case 'go':
      go(S, a.view);
      break;
    case 'open': {
      const t = S.orders.find((x) => x.id === a.id);
      if (!t) break;
      if (t.status === 'draft' && !t.viewOrder) t.viewOrder = viewOrderFor(t);
      // Coming back from the Approved screen returns to the same draft, not a deeper stack.
      if (S.view.name === 'approved' && S.view.id === t.id) {
        S.view = openView(t);
        S.playing = null;
      } else go(S, openView(t));
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
      learn(S, o!.retailer, 'reading', lt || `${R(o!).name}: “${l.heard}” confirmed as ${a.n} ${unitStr(CAT[l.sku!].unit, a.n)}.`);
      break;
    }
    case 'flag': {
      const l = line(a.i);
      const act = flagView(o!, l).actions[a.k];
      if (act) applyAction(S, o!, act, l);
      break;
    }
    case 'oflag': {
      const act = orderFlagView(o!, duesOf(S.invoices, o!.retailer)).actions[a.k];
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
      learn(S, o!.retailer, 'reading', `${R(o!).name}: “${l.itemText || l.heard}” means ${CAT[a.sku].name}.`);
      break;
    }
    case 'drop':
      o!.lines.splice(a.i, 1);
      o!.viewOrder = viewOrderFor(o!);
      break;
    case 'stop':
      S.sheet = 'stop';
      break;
    case 'profile':
      S.sheet = 'profile';
      break;
    case 'closesheet':
      S.sheet = null;
      break;
    case 'stopwhy':
      o!.status = a.v === 'Call the retailer first' ? 'held' : 'stopped';
      o!.stopReason = a.v;
      S.sheet = null;
      home(S);
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
      if (!S.invoices.some((x) => x.no === o!.invNo)) {
        S.invoices.unshift({
          no: o!.invNo!, po: o!.poNo!, retailer: o!.retailer, orderId: o!.id, issued: today(),
          lines: o!.lines.filter((l) => l.sku).map((l) => ({ sku: l.sku!, qty: l.qty, rate: rateOf(l) })),
          payLink: o!.payLink!, paidOn: null,
        });
      }
      home(S);
      toast(S, `Invoice ${o!.invNo} and payment link sent to ${r.name}${o!.echo ? ' with an order echo' : ''}.`, { head: 'Sent on WhatsApp' });
      for (const l of edits) {
        learn(S, o!.retailer, 'ordering', `${r.name}: you changed ${CAT[l.sku!].short} to ${l.qty} ${unitStr(CAT[l.sku!].unit, l.qty)}. Logged against his usual range.`);
      }
      break;
    }
    case 'handled':
      o!.status = 'handled';
      home(S);
      toast(S, `${R(o!).name} marked as handled by hand.`);
      break;
    case 'callback':
      toast(S, `Calling ${R(o!).owner} at ${R(o!).name}…`);
      break;
    case 'release': {
      const inv = releaseTarget(S, o!);
      if (!inv) break;
      const r = R(o!);
      const amount = Math.min(Math.max(1, Math.round(a.amount)), invRemaining(inv));
      o!.status = 'held';
      o!.stopReason = `Ships when ${rs(amount)} is paid`;
      o!.release = { invoice: inv.no, amount, sentOn: today() };
      o!.orderFlag!.resolved = `Ships when ${rs(amount)} of ${inv.no} is paid`;
      inv.request = { kind: 'partial', amount, sentOn: today() };
      S.sheet = null;
      home(S);
      toast(S, `Part-payment link for ${rs(amount)} sent to ${r.owner}. The ${rs(total(o!))} order ships once it’s paid.`, { head: 'Sent on WhatsApp' });
      learn(S, o!.retailer, 'credit', `${r.name}: with dues open, you ship his next order against a part-payment (${rs(amount)} of ${rs(invRemaining(inv))}). I’ll suggest the same next time.`);
      break;
    }
    case 'handoff': {
      const inv = S.invoices.find((x) => x.no === a.no);
      if (!inv || inv.handedOff || inv.paidOn) break;
      const r = RETAILERS[inv.retailer];
      const st = invState(inv);
      inv.handedOff = today();
      toast(S, `${inv.no} (${rs(invRemaining(inv))}) handed to Razorpay’s recovery agent with ${r.owner}’s payment profile.`, { head: 'Handed off' });
      learn(S, inv.retailer, 'payment', `${r.name}: ${inv.no} handed to Razorpay’s recovery agent at ${st.days} days late.`);
      break;
    }
    case 'paid': {
      const inv = S.invoices.find((x) => x.no === a.no);
      if (!inv || inv.paidOn) break;
      const st = invState(inv);
      const r = RETAILERS[inv.retailer];
      const remaining = invRemaining(inv);
      const req = inv.request?.kind === 'partial' && !inv.request.fulfilledOn ? inv.request : null;
      const amount = req ? Math.min(req.amount!, remaining) : remaining;
      inv.payments = [...(inv.payments ?? []), { on: today(), amount, late: st.status === 'late' }];
      if (req) req.fulfilledOn = today();
      if (amount >= remaining) inv.paidOn = today();

      // An order held against this invoice goes back to Rajesh once enough is paid.
      const held = S.orders.find((x) => x.release?.invoice === inv.no && x.status === 'held');
      if (held && amount >= held.release!.amount) {
        held.status = 'draft';
        held.stopReason = null;
        held.orderFlag = { type: 'credit', resolved: `${rs(amount)} received ${fmtShort(today())}. Ready to approve.` };
        held.release = null;
        if (!held.viewOrder) held.viewOrder = held.lines.map((_, i) => i);
        toast(S, `${rs(amount)} received from ${r.name}. Their ${rs(total(held))} order is back in Needs you, ready to approve.`, { head: 'Payment received' });
        learn(S, inv.retailer, 'payment', `${r.name} paid ${rs(amount)} ${daysBetween(req?.sentOn ?? today(), today())} days after the part-payment link, to get his order shipped. Holding the next order works for him.`, true);
        break;
      }
      if (!inv.paidOn) {
        toast(S, `${rs(amount)} received from ${r.name} against ${inv.no}. ${rs(invRemaining(inv))} still due.`, { head: 'Payment received' });
        learn(S, inv.retailer, 'payment', `${r.name} paid ${rs(amount)} of ${inv.no} after a part-payment link.`, true);
        break;
      }
      const d = daysBetween(inv.issued, inv.paidOn);
      toast(S, `${inv.no}: ${rs(amount)} received from ${r.name}.`, { head: 'Payment received' });
      learn(
        S,
        inv.retailer,
        'payment',
        st.status === 'late'
          ? `${r.name} paid ${inv.no} ${st.days} days late (${rs(invTotal(inv))}). The credit flag stays first on his orders until he pays on time.`
          : `${r.name} paid ${inv.no} in ${d} day${d === 1 ? '' : 's'} through the Razorpay link. Reconciled in Tally; his lines keep approving untouched.`,
        true,
      );
      break;
    }
    case 'doc':
      S.doc = a.doc;
      break;
    case 'live':
      Object.assign(S.live, a.patch);
      break;
    case 'liveAdd':
      a.order.viewOrder = viewOrderFor(a.order);
      S.orders.unshift(a.order);
      S.live = { ...S.live, busy: false, text: '', error: '' };
      go(S, { name: 'po', id: a.order.id });
      break;
  }
  return S;
}
