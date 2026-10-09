import { RETAILERS } from '../data/seed';
import { rs } from '../lib/money';
import { profileOf } from '../lib/profile';
import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';

const RISK_TONE = { good: 'green', watch: 'amber', hold: 'red' } as const;

export function Retailers({ S, dispatch }: ScreenProps) {
  const rows = Object.keys(RETAILERS)
    .map((id) => profileOf(S, id))
    .sort((a, b) => ({ hold: 0, watch: 1, good: 2 })[a.risk.level] - ({ hold: 0, watch: 1, good: 2 })[b.risk.level] || b.payment.outstanding - a.payment.outstanding);

  return (
    <Frame bar={<Title h="Retailers" sub="How each one orders and pays" />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      {rows.map((p) => (
        <button key={p.r.id} className="row-card" onClick={() => dispatch({ type: 'go', view: { name: 'retailer', id: p.r.id } })}>
          <span className="rc-main">
            <span className="rc-title">{p.r.name}</span>
            <span className="rc-sub">Pays in ~{p.payment.avgDays} days{p.payment.outstanding > 0 ? ` · ${rs(p.payment.outstanding)} unpaid` : ''}</span>
          </span>
          <span className="rc-side"><span className={`chip ${RISK_TONE[p.risk.level]}`}>{p.risk.label.split(':')[0]}</span></span>
        </button>
      ))}
    </Frame>
  );
}
