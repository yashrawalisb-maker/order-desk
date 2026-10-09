import { describe, expect, it } from 'vitest';
import { attentionFor, issuesOf } from '../src/lib/money';
import { fresh, reducer, type Action, type State } from '../src/state/store';

const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s);
const ord = (s: State, id: string) => s.orders.find((o) => o.id === id)!;

describe('information hierarchy', () => {
  it('names each order’s problems for the deck chips', () => {
    const s = fresh();
    expect(issuesOf(ord(s, 'o1')).map((x) => x.label)).toEqual(['Surf Excel 1kg · unusual qty']);
    expect(issuesOf(ord(s, 'o2')).map((x) => x.label)).toEqual(['Clinic Plus sachet · unclear', 'Dettol soap 125g · new item']);
    expect(issuesOf(ord(s, 'o3')).map((x) => x.label)).toEqual(['Fortune oil 1L · rate differs']);
  });

  it('drops issues once resolved', () => {
    const s = run(fresh(), { type: 'open', id: 'o1' }, { type: 'flag', i: 3, k: 0 });
    expect(issuesOf(ord(s, 'o1'))).toEqual([]);
  });

  it('fixes which lines sit under "Needs you" when the PO opens', () => {
    expect(attentionFor(ord(fresh(), 'o1'))).toEqual([3]);
    let s = run(fresh(), { type: 'open', id: 'o1' });
    expect(ord(s, 'o1').attention).toEqual([3]);
    s = run(s, { type: 'flag', i: 3, k: 0 }, { type: 'back' }, { type: 'open', id: 'o1' });
    expect(ord(s, 'o1').attention).toEqual([3]);
  });

  it('names unmatched items too', () => {
    const o = { ...ord(fresh(), 'o1'), lines: [{ sku: null, qty: 1, heard: 'ek dabba bournvita', itemText: 'bournvita', conf: 'low' as const }] };
    expect(issuesOf(o)).toEqual([{ label: 'bournvita · not in catalogue' }]);
  });
});
