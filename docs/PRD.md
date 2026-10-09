# Order Desk PRD: build spec for Claude Code

2026-10-09 · Yash

## 1. Context and goal

Order Desk is an AI agent for Razorpay's Agent Studio that turns a retailer's order, sent as a WhatsApp voice note, text or chit photo, into a draft purchase order the distributor approves in one tap, then into an invoice and a Razorpay payment link. It catches money leaking between the order and the payment: wrong rates, missed lines, risky credit and items missing from the retailer's usual order.

This PRD is the build spec for a demonstrable prototype, submitted to the Razorpay x ISB AI PM Build Challenge, Track 2 (Recover and Grow with AI), due 13 October 2026, 11:59 PM IST. An earlier version of the prototype exists as a single HTML page; this spec is the reference for rebuilding it as a deployable web app with a real AI call.

**The prototype must prove seven things**, in the order the brief lists them:

1. What signal identifies the opportunity: the incoming order plus that retailer's history, the price list and open dues.
2. Why AI beats a fixed rule: it reads Hinglish nicknames, reads the reason inside the message ("Diwali aa rahi hai"), and knows what is normal for this retailer.
3. What action it produces: a draft PO with flags and one-line reasons, then an invoice and a payment link.
4. What the merchant can review, change, approve or stop: every line and every flag, and nothing moves without a tap.
5. How it learns: from every edit and dismissal, and from payment outcomes.
6. How it handles accuracy, trust and failure: unclear lines must be checked, the original sits beside each line, unreadable orders go to a human.
7. What business outcome is measured: rupees protected, and days from order to payment.

**Non-goals of the prototype:** real WhatsApp ingestion, real Tally or Razorpay API calls, authentication, multi-user. Everything is sample data except the live "Try it" mode, which calls Claude.

**Merchant:** the distributor. Razorpay's merchant is Rajesh, not the retailer. The retailer is never asked to change how they order.

## 2. Users and scenarios

**Primary user: Rajesh Gupta, Gupta Distributors, Indore.** Multi-brand FMCG distributor. Buys from a few manufacturers, sells on 21-day credit to about 200 small retailers. Team: himself, one accountant, two salesmen, one van. Orders arrive on his WhatsApp as voice notes, texts and chit photos, plus salesman calls. The accountant re-types them into Tally at day end. He trusts people over software, won't adopt anything that adds typing, and his phone is his office. He is a hypothesis built from desk research; real interviews are pending.

**Secondary users (not in scope as app users):** the accountant, who sees the same inbox; the retailers, who only receive a WhatsApp echo of the final order and a payment link.

**Scenarios the prototype seeds.** Five orders on one morning, each built to demonstrate one part of the brief. Build them exactly as below; they are the demo.

| Order | Retailer | Channel | Content | What it demonstrates |
|---|---|---|---|---|
| o1 | Sharma Kirana Store, Vijay Nagar (owner Ramesh) | Voice note, 0:18, 9:12 am | "Bhaiya, red wala sabun 5 peti, Parle-G 10 dabba, Tata namak 2 bori. Aur Diwali aa rahi hai toh Surf 1 kg wale 20 packet bhej dena." | Hinglish matching; odd-quantity flag that reads his stated reason; growth nudge for a missing usual item (Vim bar); the learning moment |
| o2 | Balaji General Store, Palasia (owner Suresh) | Chit photo, 10:05 am | Handwritten: Maggi - 4 ctn / Colgate 100g - 2 dz / Clinic+ sachet - 3 strip (digit smudged, 3 or 8) / Dettol 125 - 1 ctn | Low-confidence line that must be checked before approval; new-item flag with two candidate SKUs |
| o3 | New Bharat Traders, Siyaganj (owner Mahesh) | WhatsApp text, 10:31 am | "Aashirvaad 10kg x 15 / Fortune 1L 2 peti @1840 / kal subah tak" | Price-mismatch flag (list is 1,920); order-level credit flag (42,300 overdue, 38 days on 21-day terms); hold-and-call path |
| o4 | Jai Mata Di Stores, Bhawarkua (owner Pappu) | Voice note, 0:41, 10:48 am | Mostly unintelligible over traffic noise | The failure case: no draft, raw message kept in a "needs you" queue |
| o5 | Patel Provision, Rajwada (owner Kirit) | Salesman call logged, 8:40 am | "Maggi 2 ctn, Vim bar 1 case, Red Label 1kg 6 pkt" | Already approved and invoiced at 8:52 am; shows the done state and feeds an outcome-learning entry |

**Live scenario.** In "Try it live" the user types any order in Hinglish for one of three retailers (Sharma, Balaji, New Bharat), optionally attaches a chit photo, and Claude drafts the PO against the same catalogue and history. Judges can test this with their own orders.

## 3. Scope

**Build (v1 prototype):**

- Mobile-first web app, usable on a phone and shown inside a phone frame on desktop with a side panel that narrates the flow (the "story panel").
- Three tabs: Orders (inbox), Try it live, Learned.
- Order inbox with a money headline, "Needs you" and "Done today" sections.
- Draft PO screen: original message beside every line, quantity stepper, low-confidence checks, line flags, order-level credit flag, growth nudge, Stop with reason, Approve.
- Approved screen: PO number, invoice synced to Tally, Razorpay payment link, WhatsApp echo preview with toggle, Send.
- Failure screen for an unreadable order.
- Learned tab with entries from edits, dismissals and payment outcomes.
- Live drafting through the Claude API: text order, optional chit photo, three retailers with history.
- Reset demo.

**Deliberately left out of the prototype:**

| Left out | Why | Where it goes |
|---|---|---|
| Real WhatsApp ingestion | Needs WhatsApp Business API and a number; v1 of the real product uses forward-to-a-number | Product note, section on failure cases |
| Phone-call capture | No reliable way to capture calls; the salesman sends a voice note after a call | Product note, "what I left out" |
| Real invoice, Tally sync, Razorpay payment link | API work with no demo value; show the result, not the call | Mocked with realistic numbers and a fake rzp.io link |
| Auto-approval | The AI only suggests in v1; nothing ships without a tap | Stated on the PO screen |
| Retailer-facing app | Retailers keep ordering their way | Product note |
| Price or discount negotiation, stock checks, regional languages beyond Hindi, English and Hinglish | Scope | Product note |
| Receivables chasing | Razorpay's Collections Agent already exists; Order Desk feeds it clean invoices | Phase 2 in the note |
| Login, settings, multi-user | No demo value | None |

**Rule for the build:** when a choice adds realism but not demo value, skip it. The 90-second video and a judge clicking around for two minutes are the only consumers.

## 4. Screens and flows

Six screens inside one phone-sized app shell (app bar, scrolling body, bottom bar). Every screen below lists elements top to bottom, then the interactions. Copy is final unless marked.

### 4.1 Shell

- Desktop (viewport wider than 860px): a 390x844 phone frame centred, with a story panel to its right (section 4.8). Mobile: the app fills the screen, no frame, no story panel.
- App bar: back button (when not on a tab root), title, one-line subtitle, avatar "RG" on the inbox.
- Bottom bar: on the three tab roots, the tab bar (Orders with a count badge of open orders, Try it live, Learned with a count badge). On other screens, an action bar.
- Toasts appear inside the phone above the bottom bar for 3 seconds (4 seconds for "Learned" toasts, which carry a sparkle icon and a "Learned" label).
- Bottom sheets (Stop reason) slide up over a scrim inside the phone.

### 4.2 Inbox (Orders tab)

1. Money headline, brand-blue card: large rupee figure of money protected this week, with copy "protected this week: wrong rates caught, risky credit held." If the user has asked about a missing usual item, append "And ₹X of usual items asked about." Starts at ₹2,140 and grows with actions (section 5.6).
2. Secondary line: "84% of orders approved within an hour", right-aligned "31% before Order Desk". The 84% is 21 of 25; each Send adds one to both, so one Send makes it 85% (22 of 26).
3. "Needs you" section: open orders (status draft or human), newest first. Then "Done today": approved, held, stopped, handled orders, dimmed.
4. Order card: channel icon in a circle (mic, chit, speech bubble, phone, camera), retailer name, time, one-line preview of the raw message (for a chit: "Chit photo, 4 lines"), then status chips: "Draft ready" (blue) plus "N to check" (amber) for open flags plus "N unclear" (amber) for low-confidence lines; "Couldn't read it" (red); "Invoiced 8:52 am" (green); "On hold: reason" or "Stopped: reason" (grey); "Drafted live" (grey) for live orders.
5. Tap a card: draft opens the PO screen, human opens the failure screen, everything else opens the read-only done screen.

### 4.3 Draft PO screen

1. App bar: back, retailer name, subtitle "Voice note, 9:12 am, Vijay Nagar" (channel, time, area).
2. Source block, labelled "What Ramesh sent" (owner's first name). Voice: play button, fake waveform, duration, progress animation over the real duration, transcript below with unclear parts marked. Chit: a rendered paper chit, ruled lines, red margin, handwriting font, slight rotation, torn bottom edge; the smudged digit drawn with a soft blot. Text: a chat bubble. Call: a dashed note "Call logged by salesman Vikram: ...". Live photo: the uploaded image. A "Drafted live by Claude" badge on live orders.
3. Heading "Draft purchase order", line count on the right.
4. Order-level credit flag, if any, red: title "Already overdue", reason "₹42,300 overdue for 38 days on 21-day terms. This order adds ₹10,665." (the added amount recomputes from the current lines). Buttons: "Ship anyway", "Hold and call".
5. Growth nudge, if any, blue: title "Missing from his usual order", reason "Vim bar 200g: 1 case every week for the last 9 weeks, not in this one. Worth ₹1,080 if he just forgot." Buttons: "Ask in the echo", "Skip".
6. Lines, ordered so that lines with an open flag, an unconfirmed low-confidence read, or no matched SKU come first; the order is fixed when the screen first opens so lines don't jump as flags resolve.
7. Line card: product name, "unit of pack, ₹rate" (with "rate honoured" tag if a quoted rate was accepted), amount on the right; below, the heard snippet in quotes with the channel icon (handwriting font for chit orders); quantity stepper "− 5 cases +" with pluralised units. Unmatched line: "Not in your catalogue", "They wrote: ...", a select to pick the right item, and a "Remove line" button.
8. Low-confidence line: amber left border; box "Check this. The digit reads as 3 or 8. Balaji usually orders 6 to 10 strips." with buttons for each candidate ("3 strips", "8 strips") or "Looks right" when there is no alternative.
9. Line flag, amber: title, one-line reason, action buttons from the flag type (section 6.3). Once resolved, the flag collapses to a dashed line with a tick and the chosen action.
10. Action bar: "Order total" with the live total; "Stop" (red text); "Approve PO" (primary), disabled and relabelled "Check N lines first" while any low-confidence line is unconfirmed or any line is unmatched.

Interactions: stepper changes quantity (minimum 1) and marks the line edited; any manual change on a low-confidence line also confirms it. Flag buttons apply the action, collapse the flag, and usually fire a Learned toast (section 6.4). Stop opens the reason sheet: "Retailer cancelled", "Duplicate order", "Call the retailer first", "Out of stock", "Keep the draft". Choosing a reason sets status stopped (held for "Call the retailer first"), returns to the inbox, toasts "Stopped. No PO, invoice or link went to Sharma Kirana Store." Approve assigns PO number, invoice number, payment link, and opens the Approved screen.

### 4.4 Approved screen

1. Green tick, PO number "PO GD/24-25/119", subtitle "Invoice INV-2519 raised in Tally from the approved PO".
2. Invoice card, chip "Synced to Tally": line rows "Lifebuoy 125g × 5 cases ... ₹8,160", total row.
3. Payment link card: link icon, "rzp.io/rzp/xxxxxx", sub-line "UPI, cards and netbanking. Payment reconciles to INV-2519 in Tally automatically."
4. WhatsApp echo card: checkbox "Send Ramesh a copy so he can catch a mistake before dispatch", checked by default; below it the message preview: "Namaste Ramesh ji. Your order with Gupta Distributors:" then one bullet per line, "Total ₹17,140. Pay here: rzp.io/...", then, if the growth nudge was accepted, "Vim bar 200g bhi bhejein? It's usually in your weekly order.", then "Anything wrong? Reply before 4 pm dispatch."
5. Action bar: "Send invoice and link" (primary, full width). Back button returns to the draft without losing state.

Send: status approved, approvedAt set to now, metrics updated, return to inbox, toast headed "Sent on WhatsApp": "Invoice INV-2519 and payment link sent to Sharma Kirana Store with an order echo." Any manually edited line that wasn't already covered by a flag action adds a Learned entry.

### 4.5 Failure screen (status human)

Source block (voice with unclear markers), then a red flag "No draft for this one": "Too much background noise. I could make out 2 of what sounds like 6 items, so I didn't draft a PO. Nothing is lost: the raw message stays here, the way it would without Order Desk." Action bar: "Call Pappu" (toast "Calling Pappu at Jai Mata Di Stores..."), "Mark as handled" (status handled, back to inbox).

### 4.6 Done screen (read-only)

Status chip, source block, lines in read-only form (quantity as a chip, flags shown resolved), order total. No actions.

### 4.7 Try it live and Learned tabs

Specified in sections 8 and 6.4.

### 4.8 Story panel (desktop only)

A 340px column beside the phone for the video and for judges on a laptop. Contents: "Order Desk for Razorpay Agent Studio"; a headline and one paragraph that change with the screen (inbox: "Money leaks between the order and the payment."; PO: "Rajesh reviews. Nothing moves without his tap."; approved: "One tap: invoice and Razorpay payment link."; failure: "When it can't read an order, it doesn't guess."; live: "Now try it with a real order."; learned: "Every decision is a label. So is every payment."); a seven-step pipeline, Read, Match, Check, Suggest, Rajesh decides, Invoice and payment link, Learn, with AI badges on the AI steps and done/active states that follow the screen (on the inbox the first four are done; on the PO screen step 5 is active; after approval step 6; Learn lights for 2.5 seconds whenever a learning entry is created); "Learned so far", last three entries; footer "Prototype with sample data. Gupta Distributors and its retailers are fictional." and a "Reset demo" button.

## 5. Data

All data is static JSON shipped with the app and cloned into state on load and on Reset. Rates include GST. Prices are per selling unit.

### 5.1 Catalogue

| id | Name | Short name | Unit | Pack | Rate (₹) | Nicknames |
|---|---|---|---|---|---|---|
| LB125 | Lifebuoy Total soap 125g | Lifebuoy 125g | case | 48 pcs | 1,632 | red wala sabun, lal sabun, lifebuoy |
| PG70 | Parle-G biscuits 70g | Parle-G 70g | box | 120 pcs | 540 | parle, parle-g, glucose biscuit |
| TS1 | Tata Salt 1kg | Tata Salt 1kg | bag | 25 pkts | 610 | tata namak, namak |
| SE1 | Surf Excel Easy Wash 1kg | Surf Excel 1kg | pkt | 1 kg | 118 | surf, surf 1kg |
| MG70 | Maggi noodles 70g | Maggi 70g | carton | 96 pcs | 1,190 | maggi |
| CG100 | Colgate Strong Teeth 100g | Colgate 100g | dozen | 12 pcs | 612 | colgate, colgate 100 |
| CPS | Clinic Plus shampoo sachet | Clinic Plus sachet | strip | 16 sachets | 31 | clinic plus, clinic+, shampoo sachet |
| DS125 | Dettol Original soap 125g | Dettol soap 125g | carton | 48 pcs | 2,350 | dettol sabun, dettol 125 |
| DL125 | Dettol antiseptic liquid 125ml | Dettol liquid 125ml | carton | 48 bottles | 3,310 | dettol liquid, dettol 125ml |
| AA10 | Aashirvaad atta 10kg | Aashirvaad 10kg | bag | 10 kg | 455 | aashirvaad, atta |
| FO1 | Fortune sunflower oil 1L | Fortune oil 1L | case | 12 pouches | 1,920 | fortune, fortune oil, tel |
| VB200 | Vim bar 200g | Vim bar 200g | case | 60 pcs | 1,080 | vim, vim bar |
| RL1 | Red Label tea 1kg | Red Label 1kg | pkt | 1 kg | 470 | red label, chai patti |

Unit plurals: case/cases, box/boxes, bag/bags, pkt/pkts, carton/cartons, dozen/dozen, strip/strips.

### 5.2 Retailers

| id | Name | Owner | Area | Usual order (SKU: min–max per order) | Overdue (₹) | Overdue days | Terms | Avg days to pay |
|---|---|---|---|---|---|---|---|---|
| sharma | Sharma Kirana Store | Ramesh | Vijay Nagar | LB125 4–6, PG70 8–12, TS1 2, SE1 8–10, VB200 1 | 0 | 0 | 21 | 9 |
| balaji | Balaji General Store | Suresh | Palasia | MG70 3–5, CG100 2, CPS 6–10 | 0 | 0 | 21 | 12 |
| newbharat | New Bharat Traders | Mahesh | Siyaganj | AA10 12–18, FO1 2, TS1 1–2 | 42,300 | 38 | 21 | 31 |
| patel | Patel Provision | Kirit | Rajwada | MG70 2–3, VB200 1, RL1 4–6 | 0 | 0 | 21 | 14 |
| jaimata | Jai Mata Di Stores | Pappu | Bhawarkua | none on record | 0 | 0 | 21 | 18 |

### 5.3 Order object

```json
{
  "id": "o1", "retailer": "sharma", "channel": "voice|chit|text|call|photo",
  "at": "9:12 am", "dur": 18, "status": "draft|human|approved|held|stopped|handled",
  "raw": "transcript or message text",
  "chit": {"head": ["Balaji Gen. Store", "11/10"], "lines": ["Maggi - 4 ctn"]},
  "why": "reason there is no draft (human status only)",
  "orderFlag": {"type": "credit", "resolved": null},
  "gap": {"sku": "VB200", "usual": "1 case every week for the last 9 weeks", "resolved": null, "ask": false},
  "lines": [{
    "sku": "LB125", "qty": 5, "heard": "red wala sabun 5 peti", "conf": "high|low",
    "note": "why it is unsure", "choices": [3, 8], "confirmed": false, "edited": false,
    "quotedRate": 1840, "rate": null,
    "flag": {"type": "odd_quantity|new_item|price_mismatch", "title": "", "reason": "", "actions": [], "resolved": null}
  }],
  "live": false, "photoUrl": null,
  "poNo": null, "invNo": null, "payLink": null, "echo": true, "approvedAt": null, "stopReason": null
}
```

Seeded content for o1 to o5 is in section 2. Exact seeded flags:

- o1 SE1: odd_quantity, title "Double his usual, and he says why", reason "He says Diwali is coming. He usually takes 8 to 10 and there's no festival week in his history yet, so check this once.", actions "Normal for Diwali" (learn) and "Make it 10" (set qty 10). o1 also carries the VB200 gap.
- o2 CPS: conf low, note "The digit reads as 3 or 8. Balaji usually orders 6 to 10 strips.", choices [3, 8]. o2 DS125: new_item, title "First time ordering this", reason "Balaji has never ordered Dettol. "125" could be the 125g soap or the 125ml liquid.", actions "Soap 125g" (set DS125) and "Liquid 125ml" (set DL125).
- o3 FO1: quotedRate 1840, price_mismatch flag computed from data. o3 orderFlag credit, computed from data.
- o5 is approved with approvedAt "8:52 am".

### 5.4 Learned entries

`{"t": "text", "at": "Today, 11:42 am", "outcome": false}`. Seed two outcome entries dated "Yesterday, 6:10 pm": "New Bharat Traders paid 19 days late on the last order you shipped over dues (PO 112). The credit flag now sits first on his orders." and "Patel Provision paid INV-2512 in 4 days with no corrections. His lines will keep approving untouched."

### 5.5 Numbering

PO numbers "PO GD/24-25/119" counting up from 118; invoice "INV-2519" = 2400 + PO sequence; payment link "rzp.io/rzp/" + 6 random lowercase alphanumerics, generated once at first approval and stable afterwards.

### 5.6 Metrics counters

- `wk.within` 41, `wk.total` 49: both +1 on every Send. Shown as a rounded percentage.
- `money.leak` starts at 2,140: + (list rate − quoted rate) × qty when "Keep list rate" is chosen.
- `money.held` starts at 0: + order total when "Hold and call" is chosen.
- `money.asked` starts at 0: + the usual item's rate when "Ask in the echo" is chosen.
- Headline = leak + held; asked is shown as a separate sentence.

## 6. AI behaviour

### 6.1 Five layers, and which are AI

| Layer | What it does | AI? | In the prototype |
|---|---|---|---|
| Read | Voice note, chit photo or text into line items | Commodity speech-to-text and vision | Seeded orders are pre-read; live mode sends text and the photo to Claude |
| Match | "red wala sabun, 5 peti" to LB125, 5 cases | Yes, an LLM: nicknames, Hinglish, shorthand | Claude, with the catalogue and nicknames in the prompt |
| Check | Compare with this retailer's usual range, the price list, open dues, and the reason stated in the message | Yes: per-retailer judgment plus reading intent in the text | Claude, with the retailer's history in the prompt; price and credit flags are also computed in code as a safety net |
| Suggest | Draft PO; each flag carries a one-line reason | Yes: plain-language reasons | Claude writes title and reason; code supplies the action buttons |
| Learn | Every edit, dismissal and payment outcome becomes a label | Yes in the real product; simulated here | Learned entries and toasts, counters that move |

Invoice, payment link and WhatsApp echo are not AI and must never be presented as AI.

### 6.2 Why not a fixed rule (the pitch, in product terms)

- A lookup table can't map "lal sabun" and "red wala sabun" and "lifebuoy wala" to one SKU across 200 retailers.
- A global quantity threshold fires every Diwali week. A per-retailer range with a festival memory doesn't.
- A rule can't read "Diwali aa rahi hai" inside the message and use it as the reason. The LLM can, and it says so in the flag.
- A rule fires or doesn't. It can't explain itself in one line Rajesh will read.

### 6.3 Flag types and their actions

| Type | When | Title (example) | Reason (example) | Actions (button → effect) |
|---|---|---|---|---|
| odd_quantity | Quantity far outside this retailer's usual range | "Double his usual, and he says why" | "He says Diwali is coming. He usually takes 8 to 10 ..." | Keep N → resolve + learn; Make it X (X = usual max) → set qty, mark edited, learn |
| new_item | SKU not in this retailer's history | "First time ordering this" | "Balaji has never ordered Dettol. "125" could be ..." | One button per candidate SKU → set sku, learn; with no alternatives, "Looks right" → resolve, learn |
| price_mismatch | Quoted rate differs from the list | "Rate doesn't match your list" | "Message says ₹1,840 a case. Today's list is ₹1,920. That's ₹160 on this order." | Keep list rate → resolve, add the difference to money.leak, learn; Honour ₹1,840 → set line rate, learn |
| credit (order level) | Retailer has an overdue balance | "Already overdue" | "₹42,300 overdue for 38 days on 21-day terms. This order adds ₹10,665." | Ship anyway → resolve, learn; Hold and call → status held, add total to money.held, learn |
| low confidence (not a flag) | Item or quantity genuinely ambiguous | "Check this." | Model's note | One button per candidate quantity, or "Looks right" → confirm, learn |
| gap (order level, growth) | A usual item is missing from this order | "Missing from his usual order" | "Vim bar 200g: 1 case every week for the last 9 weeks, not in this one. Worth ₹1,080 if he just forgot." | Ask in the echo → adds a line to the WhatsApp echo, adds rate to money.asked, learn; Skip → resolve |

The AI never changes a rate and never refuses credit. Both are flags with a human choice.

### 6.4 Learning rules (what gets written to Learned, and the toast text)

| Trigger | Entry text |
|---|---|
| Normal for Diwali | "Sharma Kirana stocks up about 2x in festival weeks. I'll stay quiet on Surf next Diwali." |
| Make it 10 | "Sharma Kirana Store: you trimmed Surf Excel 1kg back to 10. I'll keep flagging spikes like this one." |
| Pick a SKU on a new-item flag | "Balaji General Store: "Dettol 125 - 1 ctn" means Dettol antiseptic liquid 125ml." |
| Confirm 8 on the smudged digit | "Balaji writes his 8s like 3s. I'll read them against his usual range from now on." |
| Confirm any other low-confidence read | "{retailer}: "{heard}" confirmed as {n} {units}." |
| Keep list rate | "New Bharat Traders: list rate stands over a quoted rate. ₹160 kept on this order." |
| Honour quoted rate | "{retailer}: you honoured a quoted rate of ₹{rate}. I'll still flag quoted rates every time." |
| Ship anyway | "{retailer}: you shipped despite overdue dues. I'll keep showing the balance on every order." |
| Hold and call | "{retailer}: orders on top of overdue dues get held for a call. I'll raise this flag first next time." |
| Ask in the echo | "{retailer}: when a usual item is missing, you ask before dispatch. I'll keep suggesting it." |
| Send with manual edits | One entry per edited line: "{retailer}: you changed {item} to {n} {units}. Logged against his usual range." |

Every entry also shows as a 4-second toast labelled "Learned" and lights the Learn step in the story panel.

### 6.5 Live prompt and JSON contract

One call per draft. Model: a fast model (Claude Haiku class) for 1 to 3 second responses. Temperature low. The prompt embeds the catalogue, the chosen retailer's history and dues, and the order text; a photo, if attached, goes as an image block.

```text
You are the order desk for Gupta Distributors, an FMCG distributor in Indore, India. A small retailer sent an order. Turn it into draft purchase-order lines using ONLY the catalogue below, and flag anything the distributor should look at before approving. The distributor makes every decision; you only draft and flag.

CATALOGUE (id | name | unit | rate | nicknames):
{one line per SKU}

RETAILER: {name}
Order history (per order): {SKU (short): usually a to b units; ...}
Items not listed above have never been ordered by this retailer.
Overdue balance: {₹X for N days on 21-day terms | none}

ORDER MESSAGE (or: in the attached photo of a handwritten chit; any text below is extra):
"""{text}"""

How to read it:
- Hinglish and shorthand are normal: peti/ctn = case or carton, dabba = box, bori = bag, dz = dozen, pkt = packet, lal/red wala sabun = Lifebuoy.
- qty = number of catalogue units (whole number).
- confidence "low" only if the item or quantity is genuinely ambiguous; then give note (max 16 words) and choices (up to 2 candidate quantities) or alt_skus.
- If an item is not in the catalogue, sku = null and item_text = what they called it.
- If they quote a rate, put it in quoted_rate. Never change a rate yourself.
- If the message states a reason for an unusual quantity (a festival, a function, a sale), say so in the flag reason.
- Line flags, only when useful: "new_item", "odd_quantity", "price_mismatch". title max 5 words, reason one plain sentence max 24 words with the numbers.
- order_flag: "credit" if there is an overdue balance, else null.

Reply with only JSON in exactly this shape:
{"lines":[{"sku":"LB125","item_text":"lal sabun","qty":6,"heard":"exact words from the order","confidence":"high","note":"","choices":[],"alt_skus":[],"quoted_rate":null,"flag":null}],"order_flag":null}
where flag, when present, is {"type":"odd_quantity","title":"...","reason":"..."}.
```

**Parsing rules in code:** strip code fences; reject unknown SKU ids to null; qty = max(1, round); keep at most 20 lines; truncate heard to 80 characters and reason to 180; a line with sku null is forced to low confidence; a quoted_rate equal to the list rate is dropped; a price_mismatch flag is added in code whenever quoted_rate differs, and a credit order flag is added in code whenever the retailer has dues, regardless of what the model returned. Flag action buttons are always built in code from the type (section 6.3), never from model output.

## 7. Trust and failure cases

In v1 the AI only suggests. Nothing becomes a PO, an invoice or a payment request without the distributor's tap. Each row below is a case the prototype must show on screen, not just claim in the note.

| What could go wrong | How the prototype handles it | Where to see it |
|---|---|---|
| A line is misheard or misread | Low-confidence lines get an amber border and a "Check this" box; Approve is disabled until each is confirmed. The original voice note, chit or text sits above the lines, and each line quotes the exact words it came from | o2, Clinic Plus line |
| The retailer later says "I never ordered that" | The PO keeps the original message and the approval trail. The WhatsApp echo of the final order goes out with the invoice so the retailer can correct it before dispatch | Approved screen, echo card |
| Too many flags, so Rajesh ignores them | Flags appear only where the data supports them (one per line at most, one order-level), each with a one-line reason and a one-tap dismiss. The real product tracks the dismiss rate per flag type | Draft PO screen |
| The AI touches price or credit | It never changes a rate or refuses credit. Price and credit are flags with a human choice; "Honour ₹1,840" is Rajesh's tap | o3 |
| The AI can't read the order | No draft. The order lands in "Needs you" with the raw message and a plain explanation; Rajesh calls the retailer or marks it handled. That's today's workflow, so nothing is lost | o4 |
| The model returns garbage in live mode | Strict JSON parsing with code-side guards (section 6.5); an unparseable reply shows "The draft came back garbled. Try again, or shorten the order." and no order is created | Try it live |
| The AI service is down or rate-limited | Live mode shows a plain error and keeps the typed order in the box; sample orders keep working. The real product queues the raw message for a human | Try it live |
| Permissions and data | Each distributor's retailer data stays in his own account; the AI reads only orders sent to his business number. Not shown in the prototype; stated in the product note | Product note |

Copy rule for errors: say what happened and what to do next, in the app's voice. No apologies, no "oops", no vague "something went wrong".

## 8. Live mode (Try it live)

**Screen.** App bar "Try it live", subtitle "Claude drafts a PO from any order you type". Body: one line of intro ("Write an order the way a kirana owner would: Hinglish, nicknames, shorthand. The draft is checked against the retailer's history and today's price list."); retailer segmented control (Sharma Kirana, Balaji General, New Bharat) with a line under it: "Usually orders Lifebuoy 125g 4–6, Parle-G 70g 8–12, ... " plus "₹42,300 overdue for 38 days." where relevant; a textarea with the retailer's example as placeholder; "Use an example" link; "Add a chit photo" file input (images only); a primary button "Draft the PO". While running: spinner, "Reading, matching to the catalogue and checking Sharma Kirana Store's history..." and a Stop button. On success: a new order is created with channel text or photo, status draft, `live: true`, inserted at the top of the inbox, and the PO screen opens.

**Examples (one per retailer):**

- Sharma: "bhaiya 6 peti lal sabun, parle 10 dabba, surf 1kg 30 pkt aur red label 1kg 4 bhejna"
- Balaji: "Maggi 5 ctn, colgate 100 3 dz, clinic plus 8 strip, vim bar 1 peti, ek dabba bournvita bhi" (Bournvita is not in the catalogue, so it should come back unmatched)
- New Bharat: "atta 20 bori, fortune 3 peti 1850 wala rate, tata namak 2 bori. payment next week"

**Integration.** The browser never holds the API key. A serverless function `POST /api/draft` on Vercel takes `{retailerId, text, imageBase64?, imageMediaType?}`, builds the prompt from section 6.5 using the same catalogue and retailer JSON as the front end, calls the Anthropic Messages API with a Haiku-class model (check the current model id and request shape at docs.claude.com before coding), and returns the parsed JSON or `{error: code}`. The key lives in a Vercel environment variable `ANTHROPIC_API_KEY`. Cap the image at 1.5 MB and downscale client-side with a canvas before upload. Time out at 25 seconds.

**Abuse guard.** Rate-limit the function to 10 calls per minute per IP (an in-memory counter is fine for the demo) and cap input text at 1,000 characters. The judges' link will be public.

**Error copy by case:** rate limit → "Too many drafts in a row. Wait a minute, then try again."; unparseable reply → "The draft came back garbled. Try again, or shorten the order."; empty lines → "No order lines found. Try writing items and quantities."; network or 5xx → "Couldn't reach Claude. Try again."; image rejected → "That photo couldn't be read. Try a clearer or smaller image."

**Fallback.** If `ANTHROPIC_API_KEY` is unset, the function returns `{error: "off"}` and the tab shows "Live drafting is switched off on this deployment. The sample orders in the Orders tab show the full flow." with the button disabled. The rest of the app must work with no network at all.

## 9. Tech stack and architecture

Keep it small. One front end, one serverless function, no database.

| Part | Choice | Why |
|---|---|---|
| Front end | Vite + React + TypeScript, single page | Fast to build, easy for Claude Code, deploys to Vercel in one step |
| Styling | Plain CSS with custom properties (tokens in section 10); no component library | Keeps the look specific, avoids template defaults |
| State | One `useReducer` store holding orders, learned entries, counters and the current view; seeded from `data/seed.ts`; Reset re-seeds | No persistence needed; a reload is a reset |
| Fonts | Google Fonts: Instrument Sans (UI), Kalam (handwriting on chits) with system fallbacks | Loaded via a link tag |
| AI call | Vercel serverless function `api/draft.ts` calling the Anthropic Messages API | Key stays server-side |
| Hosting | Vercel, auto-deploy from the GitHub repo's main branch | Public URL for the submission |
| Tests | Vitest for the parser and the flag builders (`fromAI`, `flagActions`, totals) | The parts most likely to break on real model output |

**Request path for live mode:** browser builds `{retailerId, text, image}` → `POST /api/draft` → function builds the prompt from shared `seed.ts` → Anthropic API → function parses and guards the JSON → browser turns it into an order with `fromAI()` → PO screen.

**Repo structure**

```text
order-desk/
  api/draft.ts            serverless: prompt build, Anthropic call, JSON guard, rate limit
  src/
    data/seed.ts          catalogue, retailers, seeded orders, learned seeds, examples
    lib/money.ts          formatting, totals, unit plurals
    lib/flags.ts          flag builders, action builders, learning text
    lib/fromAI.ts         model JSON -> order object (pure, tested)
    state/store.ts        reducer, actions, selectors (pendingLow, openFlags, protected)
    screens/Inbox.tsx
    screens/DraftPO.tsx
    screens/Approved.tsx
    screens/Failure.tsx
    screens/Done.tsx
    screens/Live.tsx
    screens/Learned.tsx
    components/           Shell, AppBar, TabBar, ActionBar, Source (Voice, Chit, Bubble, CallNote, Photo),
                          LineCard, FlagCard, GapCard, CreditCard, Toast, Sheet, StoryPanel
    styles/tokens.css
    styles/app.css
  tests/fromAI.test.ts
  tests/flags.test.ts
  CLAUDE.md               this PRD's sections 5, 6 and 10 condensed, plus the build order
```

**Reference implementation.** A working single-file HTML version of the whole app exists (`order-desk.html`). Use it as the behavioural reference: same copy, same seeded data, same flow. The rebuild's job is to split it into components, move the AI call server-side, and deploy.

## 10. Design system

The look should read as a tool a distributor would trust on his phone: clean, light, numbers first. One loud element only: the handwritten chit, rendered as real paper beside the typed PO. Everything else stays quiet.

**Colour tokens (light; dark mode mirrors them)**

| Token | Light | Dark | Use |
|---|---|---|---|
| --bg | #E4E9F1 | #070B14 | Desktop page behind the phone |
| --app | #F4F6FA | #0F1624 | App background |
| --surface | #FFFFFF | #182133 | Cards, bars |
| --ink / --ink-2 / --ink-3 | #0E1B33 / #47556F / #5C687E | #E8EDF6 / #A7B2C6 / #8A96AC | Text, secondary, tertiary |
| --line | #DCE2EB | #29344A | Borders |
| --brand / --brand-soft | #1F5FE0 / #E5EDFD | #6B97FF / #1A2A4D | Primary actions, growth nudge |
| --amber / --amber-soft | #9A5B00 / #FFF2D6 | #F3B85A / #33270F | Flags, low-confidence |
| --red / --red-soft | #B42F28 / #FCE8E6 | #FF8F86 / #3A1B1A | Credit flag, failure |
| --green / --green-soft | #12764F / #E2F3EB | #5ACB9C / #11301F | Approved, resolved |
| --paper / --rule / --margin / --pen | #FFFCEB / #BCD0EA / #F0A8A8 / #22389A | #F3EED6 / same / same / same | The chit: paper stays light in dark mode |

**Type.** Instrument Sans for everything in the UI, 15px base, 1.45 line height; weights 400, 500, 600, 700 only. Kalam for chit text and for "heard" snippets on chit orders. Tabular numerals on every rupee figure and quantity. No all-caps labels, no letter-spaced eyebrows.

**Shape and spacing.** Cards 14px radius with a 1px --line border and no drop shadow; the phone frame 46px radius; buttons 12px (small 10px); chips pill-shaped at 11.5px semibold. 14px horizontal padding in the body, 8px between cards, 12px inside cards.

**Components and their states**

- Button: primary (brand fill), default (surface with border), ghost, danger (red text), small. Disabled primary at 45% opacity with a relabel, never a greyed-out mystery.
- Chip: grey, blue, amber, red, green.
- Flag card: amber by default, red for credit, blue for the growth nudge; resolved state is a dashed border with a green tick and the chosen action in grey.
- Line card: default; low-confidence (amber border and a 3px amber left inset); locked (read-only).
- Stepper: bordered pill, − and + at 30px targets, the count in 600 weight.
- Chit: paper background, ruled lines every 30px, a red margin line, −1.2° rotation, torn bottom edge, soft shadow; the smudged digit gets a radial blot at 38% pen colour.
- Voice note: round brand play button, 34 bars of deterministic pseudo-random height, progress overlay animated over the real duration, duration label.
- Toast: ink background, surface text, 14px radius, slides up 8px on entry.

**Motion.** Only on user actions: toast entry, sheet slide-up, voice progress. No scroll reveals, no hover effects on cards. Respect `prefers-reduced-motion`.

**Accessibility floor.** Visible focus rings (2px brand), 30px minimum tap targets, aria-labels on icon buttons, colour never the only carrier of meaning (every flag has a title).

## 11. Acceptance criteria and demo script

The build is done when every item below passes on a phone (390px wide) and on a laptop (1280px wide), in light and dark mode.

- [ ] Inbox opens with ₹2,140 protected, 84% approved within an hour, four orders under "Needs you" and Patel under "Done today".
- [ ] Sharma's PO shows the voice note with a playable progress bar, four lines each quoting its heard snippet, the Surf flag mentioning Diwali, and the Vim bar growth nudge above the lines.
- [ ] "Normal for Diwali" collapses the flag, shows a "Learned" toast, and adds the entry to the Learned tab.
- [ ] "Ask in the echo" adds the Vim bar line to the WhatsApp echo on the Approved screen.
- [ ] Approve on Sharma opens the Approved screen with PO GD/24-25/119, INV-2519, a Tally chip, a payment link and the echo; Send returns to the inbox, Sharma moves to "Done today" as "Invoiced", and the 84% figure moves to 85%.
- [ ] Balaji's PO shows the chit as paper with the smudged digit; Approve is disabled and reads "Check 1 line first" until the Clinic Plus line is confirmed; choosing 8 adds the "writes his 8s like 3s" entry; the Dettol flag offers soap and liquid and swaps the SKU on tap.
- [ ] New Bharat's PO shows the credit flag first with ₹10,665 recomputed if a quantity changes, and the price flag with ₹160; "Keep list rate" adds ₹160 to the money headline; "Hold and call" returns to the inbox with "On hold: Call the retailer first" and adds the order total to the headline.
- [ ] Jai Mata Di opens the failure screen with the unclear transcript and no draft; "Mark as handled" moves it to "Done today".
- [ ] Stop on any draft opens the reason sheet; a reason stops the order and no PO or invoice number is created.
- [ ] Try it live drafts the Sharma example in under 5 seconds into a PO with "Drafted live by Claude"; the Balaji example returns Bournvita as an unmatched line with a picker; the New Bharat example returns a price flag at ₹1,850 and a credit flag.
- [ ] A chit photo of three handwritten items drafts at least two of them correctly.
- [ ] With no API key, Try it live shows the switched-off message and everything else still works.
- [ ] Reset demo restores the seeded state.
- [ ] Lighthouse accessibility score of 90 or above on the inbox and PO screens.
- [ ] No console errors on any screen.

**90-second demo script (for the video)**

1. 0:00–0:10, inbox: "Every morning Rajesh's WhatsApp fills with orders. Order Desk has already drafted them, and it's counting the money it protected."
2. 0:10–0:40, Sharma: play the voice note, scroll the lines, point at the Diwali flag, tap "Normal for Diwali", tap "Ask in the echo", Approve, show the invoice, link and echo, Send.
3. 0:40–0:60, Balaji: show the chit beside the PO, tap "8 strips", pick "Liquid 125ml".
4. 0:60–0:70, New Bharat: show the credit flag and the ₹160 rate flag, tap "Hold and call".
5. 0:70–0:85, Try it live: type an order, show the drafted PO.
6. 0:85–0:90, Learned tab: "Every tap and every payment teaches it what's normal for each retailer."

Record on a laptop with the story panel visible, or on a phone with screen recording. Reset the demo before recording.

## 12. Build order and how to prompt Claude Code

Build in six steps, each ending in something you can open in a browser. Commit after each.

1. **Scaffold and seed.** Vite + React + TS, tokens.css, `seed.ts` with the full catalogue, retailers and five orders from sections 2 and 5. Render the Shell and the Inbox with real cards. Deploy to Vercel so the URL exists from day one.
2. **Draft PO screen.** Source blocks (voice, chit, text, call), line cards, stepper, low-confidence check, line flags with actions, order-level credit flag, growth nudge, Stop sheet, Approve gate. Wire the store so every action from section 6.3 updates state and writes a Learned entry from section 6.4.
3. **Approved, Done, Failure and Learned screens.** Numbering, payment link, echo with the toggle and the growth line, Send and its counters, outcome seeds.
4. **Story panel and polish.** Desktop phone frame, pipeline states, toasts, dark mode, reduced motion, focus rings.
5. **Live mode.** `api/draft.ts`, prompt from section 6.5, `fromAI()` with tests, the Live screen, image downscale, errors and the no-key fallback. Test all three examples and one real chit photo.
6. **Acceptance pass.** Walk section 11 on a phone and a laptop, fix, record the video.

**Opening prompt for Claude Code** (paste the whole PRD into the repo as `docs/PRD.md` first):

```text
Read docs/PRD.md fully before writing any code. Build the Order Desk prototype exactly as specified: same copy, same seeded data, same flows. Follow the build order in section 12 and stop after each step so I can check it in the browser. Use the tech stack in section 9 and the tokens in section 10; do not add a component library. Keep all text and numbers from sections 2, 5 and 6 verbatim. Write the CLAUDE.md from sections 5, 6 and 10 before starting step 1. When something in the PRD is ambiguous, pick the option that makes the 90-second demo in section 11 simplest and tell me what you chose.
```

**Prompts for later steps:** "Do step 2 from docs/PRD.md section 12. Before you start, list the state actions you'll implement and the Learned entry each one writes." For step 5: "Check docs.claude.com for the current Messages API request shape and Haiku model id before writing api/draft.ts. Write tests for fromAI() first, using the three examples in section 8 as fixtures."

**Open questions to settle before step 5**

- [ ] Does the public submission URL need live mode on, or is the video enough? If on, set a Vercel spending limit on the API key.
- [ ] Should the inbox show today's date and real clock times, or stay on the seeded "9:12 am" times? (Seeded is safer for the video.)
- [ ] Keep the English copy, or add Hindi for Rajesh-facing labels in the echo and the toasts? (English for judges; the echo already mixes Hinglish.)

**Things not to let Claude Code do**

- Add login, a database, analytics, or a settings screen.
- Put the API key in the browser bundle.
- Replace the chit rendering with a stock image.
- Change any flag reason or Learned text; those are the pitch.

## 13. Addendum: end-to-end build (9 Oct 2026)

Added at the merchant's request so a judge can walk the whole journey, from sign-in to a paid invoice. These lift two v1 non-goals (login, persistence) in demo form only.

| Area | What it does | Not real |
|---|---|---|
| Sign-in | Phone number, then a 6-digit OTP; any 6 digits pass. Account menu on the inbox avatar: business details, Reset demo data, Sign out | No SMS, no accounts |
| Saving | Orders, invoices, payments, Learned entries and counters persist in the browser across reloads | No server or database |
| Documents | Purchase order and GST tax invoice (HSN, taxable value, CGST/SGST, amount in words) from the Approved and invoice screens; Print or save as PDF | GSTINs, HSN codes and GST rates are illustrative and marked so |
| Payment tracking | Each invoice shows its payment timeline (raised, link sent, paid). "Simulate payment received" stands in for Razorpay's webhook; "Remind" re-sends the link. A payment writes an outcome entry to Learned | Payment is simulated |
| Dashboard | Receivables: outstanding, overdue, collected in 7 days, average days to pay, unpaid invoices by age (tap a bar to filter), invoice list. Retailers: dues, open orders and invoices per retailer, with a detail view (usual order, invoices, what the desk learned) | Seeded ledger of 9 past invoices |
| History | Search all POs and invoices by retailer, PO or invoice number; filter unpaid, paid, not invoiced | — |

The credit flag now reads New Bharat's dues from the invoice ledger (₹42,300, 38 days past terms on the seed), so paying that invoice clears the flag.

**Learning is silent (revised 9 Oct 2026).** Decisions no longer raise "Learned" toasts. Each learning is recorded in the background against its retailer and a topic (ordering, reading, pricing, credit, payment) and collated into the retailer's profile on the new Retailers tab, which replaces the Learned tab:

- **Ordering pattern:** how often, typical order value, channel mix (voice, chit, text, call), usual basket.
- **Payment cycle:** average days to pay against terms, on-time share, last payment, unpaid and overdue now.
- **Credit risk:** "Pays on time", "Slow payer" (pays past terms on average) or "Overdue: check before shipping" (an invoice is past terms).
- **What the desk knows:** learnings grouped by topic, newest first, repeats collapsed.

This overrides the toast behaviour in sections 4.1 and 6.4. The entry texts in 6.4 are unchanged; they appear in the profile instead.

**Overdue money: use the next order, hand off the chasing (9 Oct 2026).** Razorpay already sells recovery agents (loan and subscription recovery), so Order Desk deliberately does not chase: no reminders or calls of its own. It adds what only the order desk has:

- **The next order as leverage.** The credit flag gains "Ship when ₹X is paid". Rajesh picks a quarter, half or all of the overdue invoice and sees the WhatsApp message. Sending holds the new order and sends a part-payment link. When that amount comes in, the order returns to "Needs you", ready to approve; Rajesh still taps Approve.
- **A hand-off to Razorpay's recovery agent.** Each overdue invoice on the Dashboard can be handed off with the retailer's payment profile attached (days to pay, last late payment, preferred channel, any held order). Simulated in the prototype.
- **Outcome metric:** "Recovered from overdue, 7 days" on the Dashboard.

Every step is recorded silently in the retailer profile (credit and payments).
