import { describe, expect, it } from 'vitest';
import { RETAILERS } from '../src/data/seed';
import { fromAI } from '../src/lib/fromAI';
import { parseModelJson } from '../src/lib/prompt';

// Fixtures: plausible model replies to the three live examples in PRD section 8.
const SHARMA = {
  lines: [
    { sku: 'LB125', item_text: 'lal sabun', qty: 6, heard: '6 peti lal sabun', confidence: 'high', flag: null },
    { sku: 'PG70', item_text: 'parle', qty: 10, heard: 'parle 10 dabba', confidence: 'high', flag: null },
    { sku: 'SE1', item_text: 'surf 1kg', qty: 30, heard: 'surf 1kg 30 pkt', confidence: 'high', flag: { type: 'odd_quantity', title: 'Triple his usual', reason: 'He usually takes 8 to 10 packets; 30 is three times that with no reason given.' } },
    { sku: 'RL1', item_text: 'red label 1kg', qty: 4, heard: 'red label 1kg 4', confidence: 'high', flag: { type: 'new_item', title: 'First time ordering this', reason: 'Sharma has never ordered Red Label.' } },
  ],
  order_flag: null,
};
const BALAJI = {
  lines: [
    { sku: 'MG70', qty: 5, heard: 'Maggi 5 ctn', confidence: 'high' },
    { sku: 'CG100', qty: 3, heard: 'colgate 100 3 dz', confidence: 'high' },
    { sku: 'CPS', qty: 8, heard: 'clinic plus 8 strip', confidence: 'high' },
    { sku: 'VB200', qty: 1, heard: 'vim bar 1 peti', confidence: 'high', flag: { type: 'new_item', title: 'First time ordering this', reason: 'Balaji has never ordered Vim bar.' } },
    { sku: null, item_text: 'bournvita', qty: 1, heard: 'ek dabba bournvita', confidence: 'low' },
  ],
  order_flag: null,
};
const NEWBHARAT = {
  lines: [
    { sku: 'AA10', qty: 20, heard: 'atta 20 bori', confidence: 'high' },
    { sku: 'FO1', qty: 3, heard: 'fortune 3 peti 1850 wala rate', confidence: 'high', quoted_rate: 1850, flag: { type: 'price_mismatch', title: 'x', reason: 'y' } },
    { sku: 'TS1', qty: 2, heard: 'tata namak 2 bori', confidence: 'high' },
  ],
  order_flag: 'credit',
};

describe('fromAI', () => {
  it('drafts the Sharma example with built-in flag actions', () => {
    const lines = fromAI(SHARMA, RETAILERS.sharma);
    expect(lines.map((l) => [l.sku, l.qty])).toEqual([['LB125', 6], ['PG70', 10], ['SE1', 30], ['RL1', 4]]);
    const surf = lines[2];
    expect(surf.flag?.type).toBe('odd_quantity');
    expect(surf.flag?.actions?.map((a) => a.label)).toEqual(['Keep 30', 'Make it 10']);
    expect(lines[3].flag?.actions?.map((a) => a.label)).toEqual(['Looks right']);
  });

  it('returns Bournvita as an unmatched, low-confidence line', () => {
    const lines = fromAI(BALAJI, RETAILERS.balaji);
    const b = lines[4];
    expect(b.sku).toBeNull();
    expect(b.conf).toBe('low');
    expect(b.itemText).toBe('bournvita');
  });

  it('turns a quoted rate into a code-built price flag', () => {
    const lines = fromAI(NEWBHARAT, RETAILERS.newbharat);
    expect(lines[1].quotedRate).toBe(1850);
    expect(lines[1].flag).toEqual({ type: 'price_mismatch' });
  });

  it('guards bad model output', () => {
    const lines = fromAI(
      { lines: [{ sku: 'NOPE', qty: -3, heard: 'x'.repeat(200) }, { sku: 'TS1', qty: 2.6, quoted_rate: 610, flag: { type: 'odd_quantity', title: 't', reason: 'r' } }, null, 'junk'] },
      RETAILERS.sharma,
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ sku: null, qty: 1, conf: 'low' });
    expect(lines[0].heard).toHaveLength(80);
    expect(lines[1].qty).toBe(3);
    expect(lines[1].quotedRate).toBeUndefined(); // equal to list rate: dropped
    expect(lines[1].flag?.actions?.map((a) => a.label)).toEqual(['Keep 3', 'Make it 2']);
  });

  it('caps at 20 lines and tolerates a non-object reply', () => {
    expect(fromAI({ lines: Array.from({ length: 30 }, () => ({ sku: 'TS1', qty: 1 })) }, RETAILERS.sharma)).toHaveLength(20);
    expect(fromAI('nonsense', RETAILERS.sharma)).toEqual([]);
    expect(fromAI(null, RETAILERS.sharma)).toEqual([]);
  });

  it('adds the current quantity to candidate choices', () => {
    const [l] = fromAI({ lines: [{ sku: 'CPS', qty: 3, confidence: 'low', choices: [8] }] }, RETAILERS.balaji);
    expect(l.choices).toEqual([3, 8]);
  });
});

describe('parseModelJson', () => {
  it('strips code fences and surrounding prose', () => {
    expect(parseModelJson('```json\n{"lines":[]}\n```').lines).toEqual([]);
    expect(parseModelJson('Here you go: {"lines":[{"sku":"TS1"}]} thanks').lines).toHaveLength(1);
  });
  it('rejects garbage', () => {
    expect(() => parseModelJson('no json here')).toThrow();
    expect(() => parseModelJson('{"nolines":true}')).toThrow();
    expect(() => parseModelJson('{"lines": [}')).toThrow();
  });
});
