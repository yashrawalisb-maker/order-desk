import { RETAILERS } from '../data/seed';
import { rs } from '../lib/money';
import { CHANNEL_MOSTLY, perWeekLabel, profileOf } from '../lib/profile';
import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';

const RISK_TONE = { good: 'green', watch: 'amber', hold: 'red' } as const;

export function Retailers({ S, dispatch }: ScreenProps) {
  const rows = Object.keys(RETAILERS)
    .map((id) => profileOf(S, id))
    .sort((a, b) => ({ hold: 0, watch: 1, good: 2 })[a.risk.level] - ({ hold: 0, watch: 1, good: 2 })[b.risk.level] || b.payment.outstanding - a.payment.outstanding);

  return (
    <Frame bar={<Title h="Retailers" sub="How each one orders and pays" />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      <p className="intro">Built in the background from every order, every decision Rajesh makes and every payment.</p>
      {rows.map((p) => (
        <button key={p.r.id} className="row-card prof-card" onClick={() => dispatch({ type: 'go', view: { name: 'retailer', id: p.r.id } })}>
          <span className="rc-main">
            <span className="prof-top">
              <span className="rc-title">{p.r.name}</span>
              <span className="rc-amt">{p.payment.outstanding > 0 ? rs(p.payment.outstanding) : 'No dues'}</span>
            </span>
            <span className="prof-top">
              <span className="rc-sub">{p.r.owner} · {p.r.area}</span>
              {p.payment.outstanding > 0 && <span className="rc-note">unpaid</span>}
            </span>
            <span className="prof-facts">
              {[perWeekLabel(p.ordering.perWeek), `mostly ${CHANNEL_MOSTLY[p.ordering.channelMix[0].ch]}`, p.ordering.avgOrder > 0 ? `about ${rs(p.ordering.avgOrder)} an order` : '', `pays in ~${p.payment.avgDays} days`].filter(Boolean).join(' · ')}
            </span>
            <span className="chips" style={{ marginTop: 8 }}><span className={`chip ${RISK_TONE[p.risk.level]}`}>{p.risk.label}</span></span>
          </span>
        </button>
      ))}
    </Frame>
  );
}
