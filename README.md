# Order Desk

An AI agent for Razorpay Agent Studio. It turns a retailer's WhatsApp order (voice note, chit photo or text) into a draft purchase order the distributor approves in one tap, then into an invoice and a Razorpay payment link. Built for the Razorpay x ISB AI PM Build Challenge, Track 2.

End to end: sign in (demo OTP) → orders inbox → draft PO with AI flags → approve → purchase order and GST tax invoice (print or save as PDF) → Razorpay payment link sent → payment tracked to paid → receivables dashboard, retailer profiles (ordering pattern, payment cycle, credit risk and what the desk has learned, collated in the background) and searchable history. Data is saved in the browser; "Reset demo" in the account menu restores it.

Everything runs on sample data except **Try it live**, which sends a typed order (or chit photo) to Claude through a serverless function. Spec: [`docs/PRD.md`](docs/PRD.md).

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 (live mode shows as switched off: no API function in Vite dev)
npm test           # parser, flags, reducer flows, API guards
npm run build
```

To try live mode locally, use the Vercel CLI: `npx vercel dev` with `ANTHROPIC_API_KEY` in `.env.local`.

## Deploy to Vercel

1. Import this GitHub repo at vercel.com/new. Framework preset: Vite. No other settings needed.
2. Project → Settings → Environment Variables: add `ANTHROPIC_API_KEY`. Set a spending limit on that key in the Anthropic Console, because the demo URL is public.
3. Redeploy. Without the key, everything works except Try it live, which says it's switched off.

## Stack

Vite, React and TypeScript, plain CSS with tokens, one `useReducer` store, one Vercel function (`api/draft.ts`) calling Claude Haiku 5.5. No database, no auth. A reload resets the demo.
