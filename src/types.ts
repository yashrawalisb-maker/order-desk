export type Channel = 'voice' | 'chit' | 'text' | 'call' | 'photo';
export type Status = 'draft' | 'human' | 'approved' | 'held' | 'stopped' | 'handled';
export type Unit = 'case' | 'box' | 'bag' | 'pkt' | 'carton' | 'dozen' | 'strip';

export interface CatalogItem {
  id: string;
  name: string;
  short: string;
  unit: Unit;
  pack: string;
  rate: number;
  aka: string[];
  /** Sample HSN code and GST rate (%) for the tax invoice. Rates include GST. */
  hsn: string;
  gst: number;
}

export interface Retailer {
  id: string;
  name: string;
  owner: string;
  area: string;
  /** SKU -> [min, max] per order */
  usual: Record<string, [number, number]>;
  overdue: number;
  overdueDays: number;
  terms: number;
  avgPay: number;
  /** How Learned entries refer to this retailer, for the retailer view */
  key: string;
  gstin: string;
  address: string;
  /** Last 8 weeks before the seeded ledger: order count and how orders arrived */
  history: { orders8w: number; channels: Partial<Record<Channel, number>> };
}

export type ActionKind = 'learn' | 'setqty' | 'setsku' | 'setrate' | 'resolve' | 'hold' | 'release';

export interface FlagAction {
  label: string;
  kind: ActionKind;
  learn?: string;
  qty?: number;
  sku?: string;
  rate?: number;
  caught?: number;
}

export interface LineFlag {
  type: string;
  title?: string;
  reason?: string;
  actions?: FlagAction[];
  resolved?: string | null;
}

/** A flag ready to render: title, reason and buttons always present. */
export interface FlagView {
  title: string;
  reason: string;
  actions: FlagAction[];
  red?: boolean;
}

export interface Line {
  sku: string | null;
  qty: number;
  heard: string;
  itemText?: string;
  conf: 'high' | 'low';
  note?: string;
  choices?: number[];
  /** Learned text to write when a given choice is confirmed */
  learn?: Record<number, string>;
  confirmed?: boolean;
  edited?: boolean;
  quotedRate?: number;
  rate?: number | null;
  flag?: LineFlag;
}

export interface Order {
  id: string;
  retailer: string;
  channel: Channel;
  at: string;
  dur?: number;
  status: Status;
  raw: string;
  chit?: { head: [string, string]; lines: string[] };
  why?: string;
  orderFlag?: { type: 'credit'; resolved?: string | null };
  gap?: { sku: string; usual: string; resolved?: string | null; ask?: boolean };
  lines: Line[];
  live?: boolean;
  photoUrl?: string | null;
  poNo?: string | null;
  invNo?: string | null;
  payLink?: string | null;
  echo?: boolean;
  approvedAt?: string | null;
  stopReason?: string | null;
  /** Held until the retailer pays part of an overdue invoice */
  release?: { invoice: string; amount: number; sentOn: string } | null;
  /** Line display order, fixed when the PO screen first opens */
  viewOrder?: number[] | null;
}

/** What a learning is about, for collating it into the retailer's profile */
export type Topic = 'ordering' | 'reading' | 'pricing' | 'credit' | 'payment';

/** One thing the desk learned, recorded silently against a retailer. */
export interface Learned {
  t: string;
  at: string;
  retailer: string;
  topic: Topic;
  outcome?: boolean;
}

export interface InvoiceLine {
  sku: string;
  qty: number;
  /** Rate charged, GST included */
  rate: number;
}

export interface Invoice {
  no: string;
  po: string;
  retailer: string;
  orderId?: string;
  /** YYYY-MM-DD */
  issued: string;
  lines: InvoiceLine[];
  payLink: string;
  /** Set once nothing remains to pay */
  paidOn?: string | null;
  reminders?: number;
  /** Payments received. Seeded paid invoices have none: paidOn alone means one full payment. */
  payments?: InvoicePayment[];
  /** Rupees given up through an early-payment offer */
  discount?: number;
  /** An open part-payment request (sent to release a held order) */
  request?: CollectRequest | null;
  /** Handed to Razorpay's recovery agent on this date (YYYY-MM-DD) */
  handedOff?: string;
}

export interface InvoicePayment {
  on: string;
  amount: number;
  /** Paid after the invoice was past terms */
  late: boolean;
}

export interface CollectRequest {
  kind: 'reminder' | 'partial' | 'discount';
  sentOn: string;
  /** partial: amount asked for now */
  amount?: number;
  /** discount: percent off for paying in full by `until` */
  pct?: number;
  until?: string;
  /** Set when the requested amount came in; kept for the invoice trail */
  fulfilledOn?: string;
}

export interface Session {
  phone: string;
  name: string;
}
