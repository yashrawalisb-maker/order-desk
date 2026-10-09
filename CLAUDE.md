# Order Desk: notes for Claude Code

The full spec is `docs/PRD.md`. This file condenses the parts you need on every change (PRD sections 5, 6 and 10).

## Rules
- Copy, flag reasons and Learned texts are the pitch. Don't reword them; they live in `src/data/seed.ts`, `src/lib/flags.ts` and `src/state/store.ts`.
- Login is a demo (phone + any 6-digit OTP, no backend). State is saved in the browser (`src/state/persist.ts`). No real accounts, database, analytics or component library.
- The API key stays server-side (`api/draft.ts`, env `ANTHROPIC_API_KEY`). Never import the SDK in `src/`.
- The chit stays CSS-rendered paper, never a stock image.
- The AI only suggests. It never changes a rate or refuses credit; both are flags with a human choice. Invoice, payment link and echo are not AI and must not be labelled as AI.
- Run `npm test` and `npm run build` before committing.

## Layout
- `src/data/seed.ts`: catalogue, retailers, the five seeded orders, Learned seeds, live examples. Shared with `api/draft.ts`, so its relative imports are type-only and use `.js` extensions.
- `src/lib/`: `money.ts` (formatting, totals, units), `flags.ts` (flag views with live numbers), `fromAI.ts` (model JSON to PO lines, all guards), `prompt.ts` (the live prompt and JSON parser, server-side), `api.ts` (browser client and image downscale).
- `src/lib/receivables.ts`: invoice status, dues, ageing, GST split, amount in words. `src/data/seed.ts` `seedInvoices()` is the ledger behind the dashboard; New Bharat's dues come from it.
- `src/lib/profile.ts`: collates each retailer's profile (ordering pattern, payment cycle, credit risk, and Learned entries grouped by topic). Learning is silent: `learn()` in the store records `{retailer, topic}` and never toasts.
- `src/components/DocView.tsx`: printable PO and tax invoice (print CSS gives the PDF).
- `src/state/store.ts`: one `useReducer` store. Every action from PRD section 6.3 and every Learned entry from section 6.4 is here. The reducer clones state, then mutates the clone.
- `src/screens/`, `src/components/`: React views. `src/styles/tokens.css` holds the colour tokens.
- `api/draft.ts`: Vercel function. `GET` returns `{on}`; `POST {retailerId, text, imageBase64?, imageMediaType?}` returns the model JSON or `{error: code}`. 10 calls a minute per IP, 1,000 characters, 1.5 MB image, 25 s timeout.

## Data (PRD section 5)
- Rates include GST, per selling unit. Units: case/cases, box/boxes, bag/bags, pkt/pkts, carton/cartons, dozen/dozen, strip/strips.
- Numbering: PO `PO GD/24-25/119` counting up from 118; invoice `INV-` 2400 + sequence; link `rzp.io/rzp/` + 6 random lowercase alphanumerics, set once at first approval.
- Counters: `wk` 21/25, +1 each per Send (84% to 85% after one Send). `money.leak` 2,140 (+ list minus quoted × qty on "Keep list rate"); `money.held` (+ order total on "Hold and call"); `money.asked` (+ item rate on "Ask in the echo"). Headline = leak + held.

## AI behaviour (PRD section 6)
- Flag types: `odd_quantity` (Keep N / Make it usual-max), `new_item` (one button per candidate SKU, or Looks right), `price_mismatch` (Keep list rate / Honour quoted, always computed in code), order-level `credit` (Ship anyway / Hold and call, always added in code when dues exist), low confidence (one button per candidate quantity), `gap` growth nudge (Ask in the echo / Skip).
- Action buttons are always built in code from the flag type, never from model output.
- Parser guards: strip fences, unknown SKU to null, qty = max(1, round), at most 20 lines, heard 80 chars, reason 180, null SKU forced low confidence, quoted rate equal to list dropped.

## Design (PRD section 10)
- Instrument Sans for UI (400–700), Kalam for chit text and chit "heard" snippets. Tabular numerals on every rupee figure and quantity.
- Cards 14px radius with 1px `--line` border, no shadow. Buttons 12px (small 10px). Chips pill, 11.5px semibold.
- Flag cards: amber default, red for credit, blue for growth; resolved is dashed with a green tick.
- Motion only on user actions (toast, sheet, voice progress). Respect `prefers-reduced-motion`. 2px brand focus rings, 30px tap targets, aria-labels on icon buttons.
