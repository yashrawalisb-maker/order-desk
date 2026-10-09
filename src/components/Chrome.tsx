import type { Dispatch, ReactNode } from 'react';
import { isOpen } from '../lib/money';
import { unhandled } from '../lib/overdue';
import type { Action, State, ViewName } from '../state/store';
import { I } from './icons';

export interface ScreenProps {
  S: State;
  dispatch: Dispatch<Action>;
}

/** App bar, scrolling body and bottom bar: the three parts every screen fills. */
export function Frame({ bar, children, bottom, strip, bodyClass = '' }: { bar: ReactNode; children: ReactNode; bottom?: ReactNode; strip?: ReactNode; bodyClass?: string }) {
  return (
    <>
      <header className="appbar">{bar}</header>
      {strip}
      <main className={`screen ${bodyClass}`}>{children}</main>
      <footer className="bottom">{bottom}</footer>
    </>
  );
}

export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button className="iconbtn" onClick={onClick} aria-label={label}>{I.back()}</button>;
}

export function Title({ h, sub }: { h: string; sub: string }) {
  return <div className="grow"><h1>{h}</h1><div className="sub">{sub}</div></div>;
}

export function TabBar({ S, dispatch }: ScreenProps) {
  const open = S.orders.filter(isOpen).length;
  const tab = (id: ViewName, label: string, icon: ReactNode, dot?: number) => (
    <button onClick={() => dispatch({ type: 'tab', v: id })} aria-current={S.view.name === id ? 'page' : undefined}>
      <span className="tw">{icon}{dot ? <span className="dot" aria-label={`${dot} items`}>{dot}</span> : null}</span>
      {label}
    </button>
  );
  return (
    <nav className="tabs" aria-label="Main">
      {tab('inbox', 'Orders', I.inbox(), open)}
      {tab('dash', 'Money', I.rupee(), unhandled(S))}
      {tab('retailers', 'Retailers', I.shop())}
    </nav>
  );
}
