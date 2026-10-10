import { LIVE_EXAMPLES } from './seed';
import type { Channel } from '../types';

// Sample messages for the retailer chat. Each carries a stand-in model reply, run
// through the same fromAI guards, so the demo still drafts when live drafting is off.
// With live drafting on, the real model drafts these like any other message.

export interface Sample {
  retailer: string;
  label: string;
  channel: Channel;
  text: string;
  dur?: number;
  reply: unknown;
}

export const SAMPLES: Sample[] = [
  {
    retailer: 'sharma', label: 'Voice note', channel: 'voice', dur: 12,
    text: 'Bhaiya, Parle-G 12 dabba, lal sabun 4 peti, Tata namak 2 bori aur Vim bar ek peti bhej dena.',
    reply: {
      lines: [
        { sku: 'PG70', item_text: 'Parle-G', qty: 12, heard: 'Parle-G 12 dabba', confidence: 'high', flag: null },
        { sku: 'LB125', item_text: 'lal sabun', qty: 4, heard: 'lal sabun 4 peti', confidence: 'high', flag: null },
        { sku: 'TS1', item_text: 'Tata namak', qty: 2, heard: 'Tata namak 2 bori', confidence: 'high', flag: null },
        { sku: 'VB200', item_text: 'Vim bar', qty: 1, heard: 'Vim bar ek peti', confidence: 'high', flag: null },
      ],
      order_flag: null,
    },
  },
  {
    retailer: 'sharma', label: 'Text', channel: 'text', text: LIVE_EXAMPLES.sharma,
    reply: {
      lines: [
        { sku: 'LB125', item_text: 'lal sabun', qty: 6, heard: '6 peti lal sabun', confidence: 'high', flag: null },
        { sku: 'PG70', item_text: 'parle', qty: 10, heard: 'parle 10 dabba', confidence: 'high', flag: null },
        { sku: 'SE1', item_text: 'surf 1kg', qty: 30, heard: 'surf 1kg 30 pkt', confidence: 'high', flag: { type: 'odd_quantity', title: 'Triple his usual', reason: 'He usually takes 8 to 10 packets; 30 is three times that with no reason given.' } },
        { sku: 'RL1', item_text: 'red label 1kg', qty: 4, heard: 'red label 1kg 4', confidence: 'high', flag: { type: 'new_item', title: 'First time ordering this', reason: 'Sharma has never ordered Red Label.' } },
      ],
      order_flag: null,
    },
  },
  {
    retailer: 'balaji', label: 'Text', channel: 'text', text: LIVE_EXAMPLES.balaji,
    reply: {
      lines: [
        { sku: 'MG70', item_text: 'Maggi', qty: 5, heard: 'Maggi 5 ctn', confidence: 'high', flag: null },
        { sku: 'CG100', item_text: 'colgate 100', qty: 3, heard: 'colgate 100 3 dz', confidence: 'high', flag: null },
        { sku: 'CPS', item_text: 'clinic plus', qty: 8, heard: 'clinic plus 8 strip', confidence: 'high', flag: null },
        { sku: 'VB200', item_text: 'vim bar', qty: 1, heard: 'vim bar 1 peti', confidence: 'high', flag: { type: 'new_item', title: 'First time ordering this', reason: 'Balaji has never ordered Vim bar.' } },
        { sku: null, item_text: 'bournvita', qty: 1, heard: 'ek dabba bournvita', confidence: 'low', note: 'Bournvita isn’t in the catalogue.' },
      ],
      order_flag: null,
    },
  },
  {
    retailer: 'newbharat', label: 'Text', channel: 'text', text: LIVE_EXAMPLES.newbharat,
    reply: {
      lines: [
        { sku: 'AA10', item_text: 'atta', qty: 20, heard: 'atta 20 bori', confidence: 'high', flag: null },
        { sku: 'FO1', item_text: 'fortune', qty: 3, heard: 'fortune 3 peti 1850 wala rate', confidence: 'high', quoted_rate: 1850, flag: null },
        { sku: 'TS1', item_text: 'tata namak', qty: 2, heard: 'tata namak 2 bori', confidence: 'high', flag: null },
      ],
      order_flag: 'credit',
    },
  },
];

export const samplesFor = (retailer: string) => SAMPLES.filter((s) => s.retailer === retailer);
