import { CAT, RETAILERS } from '../data/seed';
import { isOpen, rs, unitStr } from '../lib/money';
import { duesOf, invTotal } from '../lib/receivables';
import { BackButton, Frame, Title, type ScreenProps } from '../components/Chrome';
import { InvoiceRow } from '../components/InvoiceRow';
import { I, chIcon } from '../components/icons';

export function RetailerDetail({ S, dispatch, id }: ScreenProps & { id: string }) {
  const r = RETAILERS[id];
  const invoices = S.invoices.filter((i) => i.retailer === id).sort((a, b) => b.issued.localeCompare(a.issued));
  const unpaid = invoices.filter((i) => !i.paidOn).reduce((a, i) => a + invTotal(i), 0);
  const dues = duesOf(S.invoices, id);
  const orders = S.orders.filter((o) => o.retailer === id);
  const learned = S.learned.filter((x) => x.t.includes(r.key)).slice().reverse();
  const usual = Object.entries(r.usual);

  return (
    <Frame bar={<><BackButton onClick={() => dispatch({ type: 'back' })} label="Back" /><Title h={r.name} sub={`${r.owner} · ${r.area}`} /></>}>
      <div className="kpis">
        <div className="kpi"><span className="k-label">Unpaid</span><span className="k-val">{rs(unpaid)}</span><span className="k-sub">{invoices.filter((i) => !i.paidOn).length} invoices</span></div>
        <div className="kpi"><span className="k-label">Overdue</span><span className="k-val">{rs(dues.amount)}</span><span className="k-sub">{dues.amount ? `${dues.days} days past terms` : 'Nothing late'}</span></div>
        <div className="kpi"><span className="k-label">Usually pays in</span><span className="k-val">{r.avgPay} days</span><span className="k-sub">On {r.terms}-day terms</span></div>
        <div className="kpi"><span className="k-label">GSTIN</span><span className="k-val k-small">{r.gstin}</span><span className="k-sub">{r.address.split(',')[0]}</span></div>
      </div>

      <section className="card">
        <h2>Usual order</h2>
        {usual.length ? (
          <table className="inv">
            <tbody>
              {usual.map(([sku, [a, b]]) => (
                <tr key={sku}><td>{CAT[sku].short}</td><td>{a === b ? a : `${a}–${b}`} {unitStr(CAT[sku].unit, b)}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No order history on record yet.</p>}
      </section>

      {orders.length > 0 && (
        <>
          <div className="pohead"><h2>Orders today</h2><span>{orders.length}</span></div>
          {orders.map((o) => (
            <button key={o.id} className="row-card" onClick={() => dispatch({ type: 'open', id: o.id })}>
              <span className="ch">{chIcon(o.channel)}</span>
              <span className="rc-main">
                <span className="rc-title">{o.at}</span>
                <span className="rc-sub">{o.raw.replace(/\n/g, ', ')}</span>
              </span>
              <span className="rc-side">
                <span className={`chip ${isOpen(o) ? 'blue' : o.status === 'approved' ? 'green' : ''}`}>
                  {o.status === 'draft' ? 'Draft ready' : o.status === 'human' ? 'Needs you' : o.status === 'approved' ? 'Invoiced' : o.status === 'held' ? 'On hold' : o.status === 'handled' ? 'Handled' : 'Stopped'}
                </span>
              </span>
            </button>
          ))}
        </>
      )}

      <div className="pohead"><h2>Invoices</h2><span>{invoices.length}</span></div>
      {invoices.length ? invoices.map((inv) => <InvoiceRow key={inv.no} inv={inv} dispatch={dispatch} showRetailer={false} />) : <div className="empty">No invoices yet.</div>}

      <div className="pohead"><h2>What the desk learned</h2><span>{learned.length}</span></div>
      {learned.length ? learned.map((x, i) => (
        <div key={i} className={`learn ${x.outcome ? 'outcome' : ''}`}>
          {x.outcome ? I.ok() : I.spark()}
          <div>{x.t}<small>{x.outcome ? 'From the payment outcome, ' : ''}{x.at}</small></div>
        </div>
      )) : <div className="empty">Nothing learned about {r.name} yet.</div>}
    </Frame>
  );
}
