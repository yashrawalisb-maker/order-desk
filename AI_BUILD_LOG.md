# AI build log: Order Desk

Yash Rawal, ISB PGP Co'27. Razorpay x ISB AI PM Build Challenge, Track 2: Recover and Grow with AI.
Prototype: https://order-desk-chi.vercel.app/ · Code: this repository.

## 1. AI tools and models used

| Tool / model | What I used it for |
| --- | --- |
| Claude Opus 5.5 (claude.ai, inside a Project) | Problem framing with my course frameworks, reading Razorpay's AI lineup from pages I screenshotted, stress-testing the idea, benchmarking nine alternatives, writing the PRD, a first single-file prototype, the product note, video script, pitch deck, and reviewing this repo |
| Claude Code (cloud sessions on this GitHub repo) | Building the React + TypeScript app from `docs/PRD.md`, writing tests, committing and pushing |
| Claude Haiku 5.5 (`claude-haiku-5-5`, Anthropic Messages API) | Inside the product: turns a Hinglish order or chit photo into structured draft-PO JSON with flags (`api/draft.ts`) |
| Claude Docs | The PRD, product note, video script and this log's first draft |
| GitHub, Vercel | Version history and the public prototype link |

External services: Anthropic API (live drafting), Vercel (hosting), Google Fonts. All merchant, retailer and payment data in the prototype is synthetic.

## 2. Key prompts, workflows and agent setup

**Workflow.** Chat for thinking → a written PRD as the single source of truth → Claude Code builds from the PRD in steps → I check each step in the browser → Claude reviews the repo against the PRD → fix list → next step.

**Agent setup.**
- A claude.ai Project holding the brief, the JD, my first draft and a running context file, so every chat started from the same facts.
- The PRD committed at `docs/PRD.md`, plus a `CLAUDE.md` condensed from it, so Claude Code reads the spec before every session.
- Claude Code works in cloud sessions with the GitHub app installed on this repo; Vercel auto-deploys `main`.

**Opening prompt given to Claude Code:**

```text
Read docs/PRD.md fully before writing any code. Build the Order Desk prototype exactly as specified:
same copy, same seeded data, same flows. Follow the build order in section 12 and stop after each
step so I can check it in the browser. Use the tech stack in section 9 and the tokens in section 10;
do not add a component library. Keep all text and numbers from sections 2, 5 and 6 verbatim.
Write the CLAUDE.md from sections 5, 6 and 10 before starting step 1. When something in the PRD is
ambiguous, pick the option that makes the 90-second demo in section 11 simplest and tell me what you chose.
```

**In-product prompt (live drafting).** Full text in `src/lib/prompt.ts`. It gives the model the catalogue with nicknames, that retailer's usual quantities and overdue balance, and the raw order, then asks for JSON only. Key rules: Hinglish shorthand (peti, dabba, bori); mark confidence "low" only when genuinely ambiguous; `sku: null` for items not in the catalogue; put any quoted rate in `quoted_rate` and never change a rate; if the message states a reason for an unusual quantity, say so in the flag.

**Guard rails around the model** (`src/lib/fromAI.ts`, `api/draft.ts`): strict JSON parsing, unknown SKUs forced to unmatched, quantities rounded and capped, price-mismatch and credit flags added in code regardless of model output, flag buttons built in code (never from model text), 10 calls/min per IP, 1,000-character input cap, and a no-key fallback that keeps the rest of the app working.

## 3. One AI output I rejected or corrected, and why

**The competitive-gap claim.** Claude's first version said Razorpay had five AI agents and that none of them read an order from the merchant's customer. Checking the actual pages showed eight agents plus RAY, and later screenshots of Razorpay's Agentic Stack showed agents that *do* talk to the customer (Cart Recovery, COD Confirmation, Customer Feedback), by outbound voice call. The original claim would have been wrong in front of Razorpay's own judges. I rewrote it to what the evidence supports: *Razorpay's agents reach out to the customer after a payment event; Order Desk listens to the customer before a transaction exists.* That sharper line became the core of the pitch.

Two smaller corrections from the same habit of checking:
- **Framing.** The first prototype read as faster order entry, which is productivity, not Track 2's "recover and grow". I reframed the product around money leaking between order and payment and moved the North Star from "approved within an hour" to days from order to payment.
- **Video subtitles.** The first subtitled walkthrough spread captions evenly across each scene, so "Vim bar is missing…" played over the invoice screen. I caught the mismatch; the captions were re-timed to each on-screen action.

## 4. What AI did versus what I decided or built

**I decided:**
- The problem: the distributor-to-retailer link, with the distributor as Razorpay's merchant (manufacturer-to-distributor has no real pain).
- Order capture first; receivables recovery as phase 2, then handing chasing to Razorpay's existing recovery agent.
- A hybrid prototype: scripted demo orders that can't break on camera, plus live drafting judges can try.
- The end-to-end journey (sign-in to paid invoice) and the decluttered, one-order-at-a-time layout after I judged every tab had too much text.
- What to leave out: chasing dues, auto-approval, call capture, a retailer app, price negotiation.
- The long game: the order and payment ledger as the basis for retailer ratings and, later, lending.

**AI did:** drafted the persona, PRD, notes and deck from my direction; wrote the app code and tests; wrote the in-product drafting; reviewed the repo and produced fix lists; recorded the silent walkthrough video. I reviewed every output before it went into the submission.

## 5. Known limitations, risks and verification

**Limitations**
- The persona and the problem are hypotheses from desk research. No distributor interviews yet; a concierge week with two distributors is the next step.
- All data is synthetic and every rupee figure is illustrative.
- WhatsApp ingestion, Tally sync, GST invoicing and Razorpay payment links are simulated. Phone-call orders are out of scope.
- Pre-written sample orders in the retailer chat currently show the "Drafted live by Claude" badge even though they don't call the API; only typed orders and chit photos are drafted live.
- Razorpay product information comes from their public pages on 9 October 2026 and may have changed.

**Risks**
- Misread orders: mitigated by low-confidence lines that lock Approve, the original message beside every line, and a "needs you" queue for unreadable orders. The AI never changes a rate or refuses credit.
- Cost and abuse on a public link: rate limit, input cap and a spending limit on the API key.
- Lending is a future direction only; it would need each retailer's consent and a regulated lending partner.

**Verification**
- 49 automated tests across 8 files (`npm test`), covering model-output parsing, flag building, totals and state.
- Manual walkthrough of every seeded scenario at phone and laptop width, in light and dark mode.
- An independent review of this repo against the PRD, with fixes tracked before recording.
- Video key frames checked against the script timings.
- No API keys or credentials in the repository: `.env*` is git-ignored and the key lives only in Vercel's environment settings.
