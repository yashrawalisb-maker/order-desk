import { useState } from 'react';
import { RETAILERS } from '../data/seed';
import { rs, total } from '../lib/money';
import { invState } from '../lib/receivables';
import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';
import { InvoiceRow } from '../components/InvoiceRow';
import { I, chIcon } from '../components/icons';

type F = 'all' | 'unpaid' | 'paid' | 'closed';
const FILTERS: [F, string][] = [['all', 'All'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['closed', 'Not invoiced']];

export function History({ S, dispatch }: ScreenProps) {
  const [q, setQ] = useState('');
  const [f, setF] = useState<F>('all');
  const needle = q.trim().toLowerCase();
  const match = (...xs: string[]) => !needle || xs.some((x) => x.toLowerCase().includes(needle));

  const invoices = S.invoices
    .filter((inv) => {
      const st = invState(inv).status;
      if (f === 'closed') return false;
      if (f === 'unpaid' && st === 'paid') return false;
      if (f === 'paid' && st !== 'paid') return false;
      const r = RETAILERS[inv.retailer];
      return match(r.name, r.owner, inv.no, inv.po);
    })
    .sort((a, b) => b.issued.localeCompare(a.issued) || b.no.localeCompare(a.no));

  const closed = S.orders
    .filter((o) => ['held', 'stopped', 'handled'].includes(o.status))
    .filter(() => f === 'all' || f === 'closed')
    .filter((o) => match(RETAILERS[o.retailer].name, RETAILERS[o.retailer].owner, o.stopReason ?? '', o.raw));

  return (
    <Frame bar={<Title h="Orders history" sub="Every PO, invoice and payment" />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      <label className="searchbox">
        {I.search()}
        <span className="sr">Search</span>
        <input type="search" placeholder="Retailer, PO or invoice number" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="seg filters" role="group" aria-label="Filter history">
        {FILTERS.map(([id, label]) => <button key={id} aria-pressed={f === id} onClick={() => setF(id)}>{label}</button>)}
      </div>

      {invoices.length > 0 && (
        <>
          <div className="pohead"><h2>Purchase orders and invoices</h2><span>{invoices.length}</span></div>
          {invoices.map((inv) => <InvoiceRow key={inv.no} inv={inv} dispatch={dispatch} />)}
        </>
      )}
      {closed.length > 0 && (
        <>
          <div className="pohead"><h2>Held, stopped or handled by hand</h2><span>{closed.length}</span></div>
          {closed.map((o) => (
            <button key={o.id} className="row-card" onClick={() => dispatch({ type: 'open', id: o.id })}>
              <span className="ch">{chIcon(o.channel)}</span>
              <span className="rc-main">
                <span className="rc-title">{RETAILERS[o.retailer].name}</span>
                <span className="rc-sub">Today, {o.at}{o.lines.length ? ` · ${rs(total(o))}` : ''}</span>
              </span>
              <span className="rc-side">
                <span className="chip">{o.status === 'held' ? 'On hold' : o.status === 'handled' ? 'Handled by hand' : `Stopped`}</span>
              </span>
            </button>
          ))}
        </>
      )}
      {!invoices.length && !closed.length && <div className="empty">Nothing matches “{q}”.</div>}
    </Frame>
  );
}
