import { useEffect, useState } from 'react';
import type { ScreenProps } from './Chrome';

const STEPS: [string, string, boolean][] = [
  ['Read', 'Voice note, chit photo, text or call', true],
  ['Match', 'Nicknames and Hinglish to your SKUs', true],
  ['Check', 'This retailer’s history, price list and dues', true],
  ['Suggest', 'Draft PO, every flag with a reason', true],
  ['Rajesh decides', 'Edit, approve or stop. Nothing moves without him', false],
  ['Invoice and payment link', 'Razorpay link, optional WhatsApp echo', false],
  ['Learn', 'Every edit and dismissal becomes a label', true],
];

const COPY: Record<string, [string, string]> = {
  inbox: ['Money leaks between the order and the payment.', 'Orders arrive as voice notes, chit photos and texts. Re-typing drops lines, old rates slip through, risky credit ships, disputes stall payment. Order Desk drafts every order into a PO and catches the leak before the van leaves.'],
  po: ['Rajesh reviews. Nothing moves without his tap.', 'Each line sits beside the words it came from. Flags explain themselves in one line, and the AI never changes a price or refuses credit on its own.'],
  approved: ['One tap: invoice and Razorpay payment link.', 'The approved PO becomes the invoice, so what was ordered is what gets billed. The WhatsApp echo lets the retailer catch a mistake before the van leaves.'],
  human: ['When it can’t read an order, it doesn’t guess.', 'Unclear orders land in “Needs you” with the raw message. That’s today’s workflow, so no order is lost.'],
  done: ['Every order keeps its trail.', 'The original message, the draft and Rajesh’s decision stay together, so “I never ordered that” has an answer.'],
  live: ['Now try it with a real order.', 'Type one the way a kirana owner would. Claude drafts the PO live against the sample catalogue and that retailer’s history.'],
  login: ['Rajesh signs in with his phone.', 'One number, one code. His phone is his office, so Order Desk lives there too.'],
  dash: ['Use the next order. Hand off the chasing.', 'When an overdue retailer orders again, the order ships against a part-payment through a Razorpay link. Reminders and calls go to Razorpay’s recovery agent, with the retailer’s payment profile attached.'],
  history: ['Every PO and invoice, searchable.', 'The original message, the approved PO, the invoice and the payment stay together, so “I never ordered that” has an answer.'],
  retailers: ['Every retailer, profiled.', 'How each one orders, how fast they pay and what the desk has learned from Rajesh’s decisions, collated in the background from every order and payment.'],
  retailer: ['What’s normal for each retailer.', 'Ordering pattern, payment cycle and credit risk: the profile the desk checks every new order against.'],
  invoice: ['From payment link to paid.', 'When the retailer pays the Razorpay link, the invoice closes in Tally and the payment becomes a label the desk learns from.'],
};

const PULSE_MS = 2500;

export function StoryPanel({ S, dispatch }: ScreenProps) {
  const v = S.session ? S.view.name : 'login';
  const [, tick] = useState(0);
  const learning = Date.now() - S.pulse < PULSE_MS;
  useEffect(() => {
    if (!learning) return;
    const t = setTimeout(() => tick((n) => n + 1), PULSE_MS - (Date.now() - S.pulse) + 20);
    return () => clearTimeout(t);
  }, [S.pulse, learning]);

  const st = (i: number) => {
    if (learning && i === 6) return 'on';
    if (v === 'inbox' || v === 'human') return i < 4 ? 'done' : '';
    if (v === 'po') return i < 4 ? 'done' : i === 4 ? 'on' : '';
    if (v === 'approved') return i < 5 ? 'done' : i === 5 ? 'on' : '';
    if (v === 'done') return i < 6 ? 'done' : '';
    if (v === 'live') return S.live.busy ? (i < 4 ? 'on' : '') : '';
    if (v === 'retailers') return i === 6 ? 'on' : '';
    if (v === 'invoice' || v === 'history') return i < 6 ? 'done' : '';
    if (v === 'dash') return i === 5 ? 'on' : i < 5 ? 'done' : '';
    if (v === 'retailer') return i === 2 || i === 6 ? 'on' : '';
    return '';
  };
  const [h, lead] = COPY[v];

  return (
    <aside className="story" aria-label="How Order Desk works">
      <div className="brand"><b>Order Desk</b> for Razorpay Agent Studio</div>
      <h2 aria-live="polite">{h}</h2>
      <p className="lead">{lead}</p>
      <ol className="pipe">
        {STEPS.map(([b, s, ai], i) => (
          <li key={b} className={`${st(i)} ${ai ? 'ai' : ''}`}><span><b>{b}</b><span>{s}</span></span></li>
        ))}
      </ol>
      <div className="foot">
        <span>Prototype with sample data. Gupta Distributors and its retailers are fictional.</span>
        {S.session && <button className="btn small" onClick={() => dispatch({ type: 'reset' })}>Reset demo</button>}
      </div>
    </aside>
  );
}
