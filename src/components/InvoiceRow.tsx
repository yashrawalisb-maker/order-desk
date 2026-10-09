import type { Dispatch } from 'react';
import { RETAILERS } from '../data/seed';
import { rs } from '../lib/money';
import { fmtShort, invState, invTotal, statusLabel, type InvoiceState } from '../lib/receivables';
import type { Action } from '../state/store';
import type { Invoice } from '../types';

export function PayChip({ st }: { st: InvoiceState }) {
  const tone = st.status === 'paid' ? 'green' : st.status === 'late' ? 'red' : 'blue';
  return <span className={`chip ${tone}`}>{statusLabel(st)}</span>;
}

export function InvoiceRow({ inv, dispatch, showRetailer = true }: { inv: Invoice; dispatch: Dispatch<Action>; showRetailer?: boolean }) {
  const st = invState(inv);
  return (
    <button className="row-card" onClick={() => dispatch({ type: 'go', view: { name: 'invoice', id: inv.no } })}>
      <span className="rc-main">
        <span className="rc-title">{showRetailer ? RETAILERS[inv.retailer].name : inv.no}</span>
        <span className="rc-sub">{showRetailer ? `${inv.no} · ` : ''}{inv.po.replace('PO GD/24-25/', 'PO ')} · {fmtShort(inv.issued)}</span>
      </span>
      <span className="rc-side">
        <span className="rc-amt">{rs(invTotal(inv))}</span>
        <PayChip st={st} />
      </span>
    </button>
  );
}
