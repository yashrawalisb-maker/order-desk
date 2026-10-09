import { Frame, TabBar, Title, type ScreenProps } from '../components/Chrome';
import { I } from '../components/icons';

export function Learned({ S, dispatch }: ScreenProps) {
  return (
    <Frame bar={<Title h="What the desk has learned" sub="From Rajesh’s edits, approvals and dismissals" />} bottom={<TabBar S={S} dispatch={dispatch} />}>
      {S.learned.length ? (
        S.learned.slice().reverse().map((x, i) => (
          <div key={S.learned.length - i} className={`learn ${x.outcome ? 'outcome' : ''}`}>
            {x.outcome ? I.ok() : I.spark()}
            <div>{x.t}<small>{x.outcome ? 'From the payment outcome, ' : ''}{x.at}</small></div>
          </div>
        ))
      ) : (
        <div className="empty">Nothing yet. Open a draft and act on a flag: every choice Rajesh makes teaches the desk what’s normal for that retailer.</div>
      )}
    </Frame>
  );
}
