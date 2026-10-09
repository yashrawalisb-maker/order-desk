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
}

export type ActionKind = 'learn' | 'setqty' | 'setsku' | 'setrate' | 'resolve' | 'hold';

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
  /** Line display order, fixed when the PO screen first opens */
  viewOrder?: number[] | null;
}

export interface Learned {
  t: string;
  at: string;
  outcome?: boolean;
}
