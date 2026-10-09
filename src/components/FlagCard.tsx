import type { ReactElement } from 'react';
import type { FlagView } from '../types';
import { I } from './icons';

export function FlagCard({ f, onAction, tone, icon, className = '' }: {
  f: FlagView;
  onAction: (k: number) => void;
  tone?: 'red' | 'grow';
  icon?: ReactElement;
  className?: string;
}) {
  const t = tone ?? (f.red ? 'red' : '');
  return (
    <div className={`flag ${t} ${className}`}>
      <div className="ft">{icon ?? I.flag()}{f.title}</div>
      <p>{f.reason}</p>
      {f.actions.length > 0 && (
        <div className="acts">
          {f.actions.map((a, k) => <button key={k} className="btn small" onClick={() => onAction(k)}>{a.label}</button>)}
        </div>
      )}
    </div>
  );
}

export function Resolved({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`flag done ${className}`}>{I.ok()}<span>{text}</span></div>;
}
