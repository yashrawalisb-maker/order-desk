import { useEffect, useRef, type Dispatch } from 'react';
import { CAT, DISTRIBUTOR, RETAILERS } from '../data/seed';
import { rateOf, unitStr } from '../lib/money';
import { addDays, amountInWords, fmtDate, rs2, taxLines, today } from '../lib/receivables';
import type { Action, DocRef, State } from '../state/store';
import type { InvoiceLine } from '../types';
import { chName } from './icons';

interface DocData {
  po: string;
  inv: string;
  date: string;
  retailer: string;
  lines: InvoiceLine[];
  payLink: string;
  source?: string;
  approvedAt?: string;
}

function resolve(S: State, ref: DocRef): DocData | null {
  if (ref.invoice) {
    const inv = S.invoices.find((x) => x.no === ref.invoice);
    if (!inv) return null;
    const o = inv.orderId ? S.orders.find((x) => x.id === inv.orderId) : undefined;
    return {
      po: inv.po, inv: inv.no, date: inv.issued, retailer: inv.retailer, lines: inv.lines, payLink: inv.payLink,
      source: o ? `${chName(o.channel)}, ${o.at}` : undefined, approvedAt: o?.approvedAt ?? undefined,
    };
  }
  const o = S.orders.find((x) => x.id === ref.order);
  if (!o || !o.poNo) return null;
  return {
    po: o.poNo, inv: o.invNo!, date: today(), retailer: o.retailer, payLink: o.payLink!,
    lines: o.lines.filter((l) => l.sku).map((l) => ({ sku: l.sku!, qty: l.qty, rate: rateOf(l) })),
    source: `${chName(o.channel)}, ${o.at}`, approvedAt: o.approvedAt ?? undefined,
  };
}

const Party = ({ title, name, lines }: { title: string; name: string; lines: string[] }) => (
  <div className="party">
    <span className="pt">{title}</span>
    <b>{name}</b>
    {lines.map((l, i) => <span key={i}>{l}</span>)}
  </div>
);

export function DocView({ S, dispatch }: { S: State; dispatch: Dispatch<Action> }) {
  const ref = S.doc!;
  const d = resolve(S, ref);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dispatch({ type: 'doc', doc: null });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  if (!d) return null;
  const r = RETAILERS[d.retailer];
  const isInv = ref.kind === 'invoice';
  const tx = taxLines(d.lines);
  const title = isInv ? 'Tax invoice' : 'Purchase order';

  return (
    <div className="docwrap" role="dialog" aria-modal="true" aria-label={`${title} ${isInv ? d.inv : d.po}`}>
      <div className="doctools">
        <span>{title} · {isInv ? d.inv : d.po}</span>
        <span className="grow" />
        {isInv
          ? <button className="btn small" onClick={() => dispatch({ type: 'doc', doc: { ...ref, kind: 'po' } })}>View PO</button>
          : <button className="btn small" onClick={() => dispatch({ type: 'doc', doc: { ...ref, kind: 'invoice' } })}>View invoice</button>}
        <button className="btn small primary" onClick={() => window.print()}>Print or save as PDF</button>
        <button className="btn small" ref={closeRef} onClick={() => dispatch({ type: 'doc', doc: null })}>Close</button>
      </div>

      <article className="doc">
        <header className="doc-head">
          <div>
            <h1>{DISTRIBUTOR.name}</h1>
            <p>{DISTRIBUTOR.address}</p>
            <p>GSTIN {DISTRIBUTOR.gstin} · +91 {DISTRIBUTOR.phone}</p>
          </div>
          <div className="doc-title">
            <h2>{title}</h2>
            <dl>
              <dt>{isInv ? 'Invoice no.' : 'PO no.'}</dt><dd>{isInv ? d.inv : d.po}</dd>
              <dt>Date</dt><dd>{fmtDate(d.date)}</dd>
              {isInv ? <><dt>Against</dt><dd>{d.po}</dd><dt>Due</dt><dd>{fmtDate(addDays(d.date, r.terms))}</dd></> : <><dt>Terms</dt><dd>{r.terms} days credit</dd></>}
            </dl>
          </div>
        </header>

        <div className="parties">
          <Party title={isInv ? 'Bill to' : 'Ordered by'} name={r.name} lines={[`${r.owner} · ${r.address}`, `GSTIN ${r.gstin}`]} />
          <Party title={isInv ? 'Place of supply' : 'Supplier'} name={isInv ? DISTRIBUTOR.state : DISTRIBUTOR.name} lines={isInv ? ['Intra-state supply: CGST + SGST'] : [DISTRIBUTOR.address]} />
        </div>

        {isInv ? (
          <table className="doc-table">
            <thead>
              <tr><th>#</th><th>Item</th><th>HSN</th><th className="n">Qty</th><th className="n">Taxable value</th><th className="n">GST</th><th className="n">CGST</th><th className="n">SGST</th><th className="n">Amount</th></tr>
            </thead>
            <tbody>
              {tx.rows.map((x, i) => (
                <tr key={i}>
                  <td>{i + 1}</td><td>{x.c.name}</td><td>{x.c.hsn}</td>
                  <td className="n">{x.qty} {unitStr(x.c.unit, x.qty)}</td>
                  <td className="n">{rs2(x.taxable)}</td><td className="n">{x.c.gst}%</td>
                  <td className="n">{rs2(x.cgst)}</td><td className="n">{rs2(x.sgst)}</td><td className="n">{rs2(x.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4}>Total</td><td className="n">{rs2(tx.taxable)}</td><td /><td className="n">{rs2(tx.cgst)}</td><td className="n">{rs2(tx.sgst)}</td><td className="n">{rs2(tx.amount)}</td></tr>
            </tfoot>
          </table>
        ) : (
          <table className="doc-table">
            <thead>
              <tr><th>#</th><th>Item</th><th>Pack</th><th className="n">Qty</th><th className="n">Rate (incl. GST)</th><th className="n">Amount</th></tr>
            </thead>
            <tbody>
              {d.lines.map((l, i) => {
                const c = CAT[l.sku];
                return (
                  <tr key={i}>
                    <td>{i + 1}</td><td>{c.name}</td><td>{c.unit} of {c.pack}</td>
                    <td className="n">{l.qty} {unitStr(c.unit, l.qty)}</td><td className="n">{rs2(l.rate)}</td><td className="n">{rs2(l.rate * l.qty)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={5}>Total</td><td className="n">{rs2(tx.amount)}</td></tr></tfoot>
          </table>
        )}

        <p className="words"><b>Amount in words:</b> {amountInWords(tx.amount)}</p>

        <div className="doc-foot">
          <div>
            {isInv ? (
              <>
                <b>Pay by Razorpay link</b>
                <p>{d.payLink}</p>
                <p>UPI, cards and netbanking. Payment reconciles to {d.inv} automatically.</p>
              </>
            ) : (
              <>
                <b>Order trail</b>
                {d.source && <p>Received as: {d.source}</p>}
                <p>Drafted by Order Desk, reviewed and approved by {DISTRIBUTOR.owner}{d.approvedAt ? ` at ${d.approvedAt}` : ''}.</p>
              </>
            )}
          </div>
          <div className="sign">
            <span>For {DISTRIBUTOR.name}</span>
            <span className="sig">{DISTRIBUTOR.owner}</span>
            <span>Authorised signatory</span>
          </div>
        </div>

        <p className="disclaimer">Sample document from the Order Desk prototype. Business details, GSTINs, HSN codes and GST rates are illustrative; this is not a valid tax invoice.</p>
      </article>
    </div>
  );
}
