import type { CatalogItem, Learned, Order, Retailer } from '../types.js';

// Shared by the browser and api/draft.ts. Keep relative imports here type-only
// so the serverless function can load this file without a bundler.

export const CATALOG: CatalogItem[] = [
  { id: 'LB125', name: 'Lifebuoy Total soap 125g', short: 'Lifebuoy 125g', unit: 'case', pack: '48 pcs', rate: 1632, aka: ['red wala sabun', 'lal sabun', 'lifebuoy'] },
  { id: 'PG70', name: 'Parle-G biscuits 70g', short: 'Parle-G 70g', unit: 'box', pack: '120 pcs', rate: 540, aka: ['parle', 'parle-g', 'glucose biscuit'] },
  { id: 'TS1', name: 'Tata Salt 1kg', short: 'Tata Salt 1kg', unit: 'bag', pack: '25 pkts', rate: 610, aka: ['tata namak', 'namak'] },
  { id: 'SE1', name: 'Surf Excel Easy Wash 1kg', short: 'Surf Excel 1kg', unit: 'pkt', pack: '1 kg', rate: 118, aka: ['surf', 'surf 1kg'] },
  { id: 'MG70', name: 'Maggi noodles 70g', short: 'Maggi 70g', unit: 'carton', pack: '96 pcs', rate: 1190, aka: ['maggi'] },
  { id: 'CG100', name: 'Colgate Strong Teeth 100g', short: 'Colgate 100g', unit: 'dozen', pack: '12 pcs', rate: 612, aka: ['colgate', 'colgate 100'] },
  { id: 'CPS', name: 'Clinic Plus shampoo sachet', short: 'Clinic Plus sachet', unit: 'strip', pack: '16 sachets', rate: 31, aka: ['clinic plus', 'clinic+', 'shampoo sachet'] },
  { id: 'DS125', name: 'Dettol Original soap 125g', short: 'Dettol soap 125g', unit: 'carton', pack: '48 pcs', rate: 2350, aka: ['dettol sabun', 'dettol 125'] },
  { id: 'DL125', name: 'Dettol antiseptic liquid 125ml', short: 'Dettol liquid 125ml', unit: 'carton', pack: '48 bottles', rate: 3310, aka: ['dettol liquid', 'dettol 125ml'] },
  { id: 'AA10', name: 'Aashirvaad atta 10kg', short: 'Aashirvaad 10kg', unit: 'bag', pack: '10 kg', rate: 455, aka: ['aashirvaad', 'atta'] },
  { id: 'FO1', name: 'Fortune sunflower oil 1L', short: 'Fortune oil 1L', unit: 'case', pack: '12 pouches', rate: 1920, aka: ['fortune', 'fortune oil', 'tel'] },
  { id: 'VB200', name: 'Vim bar 200g', short: 'Vim bar 200g', unit: 'case', pack: '60 pcs', rate: 1080, aka: ['vim', 'vim bar'] },
  { id: 'RL1', name: 'Red Label tea 1kg', short: 'Red Label 1kg', unit: 'pkt', pack: '1 kg', rate: 470, aka: ['red label', 'chai patti'] },
];

export const CAT: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((c) => [c.id, c]));

export const RETAILERS: Record<string, Retailer> = {
  sharma: { id: 'sharma', name: 'Sharma Kirana Store', owner: 'Ramesh', area: 'Vijay Nagar', usual: { LB125: [4, 6], PG70: [8, 12], TS1: [2, 2], SE1: [8, 10], VB200: [1, 1] }, overdue: 0, overdueDays: 0, terms: 21, avgPay: 9 },
  balaji: { id: 'balaji', name: 'Balaji General Store', owner: 'Suresh', area: 'Palasia', usual: { MG70: [3, 5], CG100: [2, 2], CPS: [6, 10] }, overdue: 0, overdueDays: 0, terms: 21, avgPay: 12 },
  newbharat: { id: 'newbharat', name: 'New Bharat Traders', owner: 'Mahesh', area: 'Siyaganj', usual: { AA10: [12, 18], FO1: [2, 2], TS1: [1, 2] }, overdue: 42300, overdueDays: 38, terms: 21, avgPay: 31 },
  patel: { id: 'patel', name: 'Patel Provision', owner: 'Kirit', area: 'Rajwada', usual: { MG70: [2, 3], VB200: [1, 1], RL1: [4, 6] }, overdue: 0, overdueDays: 0, terms: 21, avgPay: 14 },
  jaimata: { id: 'jaimata', name: 'Jai Mata Di Stores', owner: 'Pappu', area: 'Bhawarkua', usual: {}, overdue: 0, overdueDays: 0, terms: 21, avgPay: 18 },
};

export const SEED_ORDERS: Order[] = [
  {
    id: 'o1', retailer: 'sharma', channel: 'voice', at: '9:12 am', dur: 18, status: 'draft',
    raw: 'Bhaiya, red wala sabun 5 peti, Parle-G 10 dabba, Tata namak 2 bori. Aur Diwali aa rahi hai toh Surf 1 kg wale 20 packet bhej dena.',
    gap: { sku: 'VB200', usual: '1 case every week for the last 9 weeks' },
    lines: [
      { sku: 'LB125', qty: 5, heard: 'red wala sabun 5 peti', conf: 'high' },
      { sku: 'PG70', qty: 10, heard: 'Parle-G 10 dabba', conf: 'high' },
      { sku: 'TS1', qty: 2, heard: 'Tata namak 2 bori', conf: 'high' },
      {
        sku: 'SE1', qty: 20, heard: 'Surf 1 kg wale 20 packet', conf: 'high',
        flag: {
          type: 'odd_quantity', title: 'Double his usual, and he says why',
          reason: 'He says Diwali is coming. He usually takes 8 to 10 and there’s no festival week in his history yet, so check this once.',
          actions: [
            { label: 'Normal for Diwali', kind: 'learn', learn: 'Sharma Kirana stocks up about 2x in festival weeks. I’ll stay quiet on Surf next Diwali.' },
            { label: 'Make it 10', kind: 'setqty', qty: 10 },
          ],
        },
      },
    ],
  },
  {
    id: 'o2', retailer: 'balaji', channel: 'chit', at: '10:05 am', status: 'draft',
    // The third line's digit is drawn smudged; "[3]" marks it for the Chit component.
    chit: { head: ['Balaji Gen. Store', '11/10'], lines: ['Maggi - 4 ctn', 'Colgate 100g - 2 dz', 'Clinic+ sachet - [3] strip', 'Dettol 125 - 1 ctn'] },
    raw: 'Photo of a handwritten chit, 4 lines',
    lines: [
      { sku: 'MG70', qty: 4, heard: 'Maggi - 4 ctn', conf: 'high' },
      { sku: 'CG100', qty: 2, heard: 'Colgate 100g - 2 dz', conf: 'high' },
      {
        sku: 'CPS', qty: 3, heard: 'Clinic+ sachet - 3 strip', conf: 'low',
        note: 'The digit reads as 3 or 8. Balaji usually orders 6 to 10 strips.', choices: [3, 8],
        learn: { 8: 'Balaji writes his 8s like 3s. I’ll read them against his usual range from now on.' },
      },
      {
        sku: 'DS125', qty: 1, heard: 'Dettol 125 - 1 ctn', conf: 'high',
        flag: {
          type: 'new_item', title: 'First time ordering this',
          reason: 'Balaji has never ordered Dettol. “125” could be the 125g soap or the 125ml liquid.',
          actions: [
            { label: 'Soap 125g', kind: 'setsku', sku: 'DS125' },
            { label: 'Liquid 125ml', kind: 'setsku', sku: 'DL125' },
          ],
        },
      },
    ],
  },
  {
    id: 'o3', retailer: 'newbharat', channel: 'text', at: '10:31 am', status: 'draft',
    raw: 'Aashirvaad 10kg x 15\nFortune 1L 2 peti @1840\nkal subah tak',
    orderFlag: { type: 'credit' },
    lines: [
      { sku: 'AA10', qty: 15, heard: 'Aashirvaad 10kg x 15', conf: 'high' },
      { sku: 'FO1', qty: 2, heard: 'Fortune 1L 2 peti @1840', conf: 'high', quotedRate: 1840, flag: { type: 'price_mismatch' } },
    ],
  },
  {
    id: 'o4', retailer: 'jaimata', channel: 'voice', at: '10:48 am', dur: 41, status: 'human',
    raw: '[traffic noise] … bhaiya woh … [unclear] … teen … [unclear] … aur woh wala … [unclear] … jaldi bhejna',
    why: 'Too much background noise. I could make out 2 of what sounds like 6 items, so I didn’t draft a PO.',
    lines: [],
  },
  {
    id: 'o5', retailer: 'patel', channel: 'call', at: '8:40 am', status: 'approved', approvedAt: '8:52 am',
    raw: 'Call logged by salesman Vikram: Maggi 2 ctn, Vim bar 1 case, Red Label 1kg 6 pkt',
    lines: [
      { sku: 'MG70', qty: 2, heard: 'Maggi 2 ctn', conf: 'high' },
      { sku: 'VB200', qty: 1, heard: 'Vim bar 1 case', conf: 'high' },
      { sku: 'RL1', qty: 6, heard: 'Red Label 1kg 6 pkt', conf: 'high' },
    ],
  },
];

export const SEED_LEARNED: Learned[] = [
  { t: 'New Bharat Traders paid 19 days late on the last order you shipped over dues (PO 112). The credit flag now sits first on his orders.', at: 'Yesterday, 6:10 pm', outcome: true },
  { t: 'Patel Provision paid INV-2512 in 4 days with no corrections. His lines will keep approving untouched.', at: 'Yesterday, 6:10 pm', outcome: true },
];

export const LIVE_RETAILERS = ['sharma', 'balaji', 'newbharat'] as const;

export const LIVE_EXAMPLES: Record<string, string> = {
  sharma: 'bhaiya 6 peti lal sabun, parle 10 dabba, surf 1kg 30 pkt aur red label 1kg 4 bhejna',
  balaji: 'Maggi 5 ctn, colgate 100 3 dz, clinic plus 8 strip, vim bar 1 peti, ek dabba bournvita bhi',
  newbharat: 'atta 20 bori, fortune 3 peti 1850 wala rate, tata namak 2 bori. payment next week',
};

export const PO_SEQ_START = 118;
export const MAX_TEXT = 1000;
