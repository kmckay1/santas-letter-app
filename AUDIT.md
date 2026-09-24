# SantasLetter.ai: Privacy, Payments and Reliability Audit

**Audited:** 2026-09-23, at commit `a01a66c` on `main`
**Scope:** everything tracked in this repository, plus the names (not values) of the variables in `.env.local`.
**Method:** read-only review of the code. Nothing was run against production, and no dashboards were checked.

This is an engineering audit, not legal advice. Items marked **LEGAL RISK** are the places where the code, the marketing copy and the legal pages disagree with each other or with laws that commonly apply to a US business selling to parents in the US, UK and EU. Before relying on any of it, have a lawyer confirm the legal conclusions.

### Not verifiable from the repo

The repo cannot answer these. Each needs a direct check in the service's dashboard:

- The schema and RLS policies for `letters`, `subscribers` and `scheduled_letters`. Only `webhook_sessions` and the referral columns have SQL in `supabase/`.
- Whether the `lob-letters` storage bucket is public. The code depends on it being public (see 1.4).
- The Supabase plan, backup schedule and whether PITR is enabled.
- Meta Pixel settings in Events Manager, especially Automatic Advanced Matching.
- Contentsquare masking and recording settings.
- Anthropic Console spend limits.
- Whether any "Add a child" ($15) purchases have happened in Stripe.
- Whether the homepage testimonials came from real customers.

---

## Risk register (read this first)

Ranked by how likely each one is to produce a claim, a regulator letter or a chargeback wave, weighted by how bad that would be.

| # | Risk | Why it is exposure | Where |
|---|---|---|---|
| 1 | **Session replay and the Meta Pixel load on every page before any consent, and the child's name reaches Meta in the URL** | California Invasion of Privacy Act (CIPA) wiretap suits over session replay and pixels are a steady, active class-action genre, and the business says it is in California. EU and UK visitors (the site offers 11 non-English languages and ships to 16 non-US countries) get no consent prompt, which ePrivacy/PECR requires for these scripts. Under CCPA/CPRA, the Pixel counts as "sharing", which needs a "Do Not Sell or Share" link and honouring of GPC. Neither exists. | `app/layout.tsx:62-88`, `app/page.tsx:157`, `lib/stripe.ts:96` |
| 2 | **The privacy policy makes specific promises the code breaks** | This is the standard FTC Act §5 / state UDAP deception theory. Examples: "Anthropic: letter content only, no personal identifiers" (the child's name, age, behaviour notes and the parent's secret note are all sent). "We do not store child information beyond what is necessary to fulfil your order" (it is kept forever). Lob is named, but Stannp and PDFShift are not. Contentsquare is not mentioned anywhere. Only "transactional emails" are described, yet three marketing emails go out. Full list in section 6. | `app/privacy/page.tsx` |
| 3 | **Children's letters, with name and home address, sit as files in a publicly readable bucket and are never deleted** | A leak here would be a breach of children's data plus home addresses, and California's data-breach private right of action covers it. Files from the Lob era are named only by child name and a millisecond timestamp. | `lib/stannp.ts:166-174,192`, `lib/lob.ts:21,32` |
| 4 | **"Add a child" charges $15 and delivers nothing** | The webhook has no branch for the `addChild` tier. It collects no child details and no address. It sends an "Order confirmed" email and stops. That is taking money for nothing: chargebacks, and potentially state consumer-fraud claims. | `app/success/page.tsx:100-110,185`, `app/preview/page.tsx:656`, `app/api/webhook/route.ts` |
| 5 | **Delivery promises contradict what the system does** | The site says "printed and posted within 1–2 business days" in four places, but orders are held until at least Nov 22. It says "Delivery guaranteed before Christmas Eve" while the refunds page says Christmas delivery cannot be guaranteed. It promises "hand-stamped", but Stannp prints the letters with metered postage. The confirmation says "We'll email you the moment it ships", and no such email exists. The FTC Mail Order Rule requires shipping within the time you state, or within 30 days, with delay notices and an option to cancel. | see section 6 |
| 6 | **Testimonials and a strikethrough price may be fabricated** | Three named 5-star testimonials are hardcoded. One describes a printed letter arriving, yet the current pipeline mails nothing before 2026-11-22. The video page shows "$34.99" struck through for a product that has never been sold. The FTC's 2024 rule on fake reviews carries civil penalties, and fictitious former prices fall under 16 CFR 233 and Cal. B&P §17501. | `app/page.tsx:62-84`, `app/video/page.tsx:147` |
| 7 | **No rate limit, auth, CAPTCHA or server-side input cap on the Opus-backed `/api/generate`** | Anyone can script unlimited Anthropic calls. Each call also stores a row and emails an **arbitrary, unverified address**, with three more emails scheduled after it. The child's name goes unescaped into the email HTML, so the endpoint can be used to send phishing from `santa@santasletter.ai`. | `app/api/generate/route.ts`, `lib/resend.ts:57,76` |
| 8 | **Marketing emails break CAN-SPAM and EU consent rules** | No email carries a physical postal address. Unsubscribe writes ignore failures, so a user can see "unsubscribed" and keep getting mail. There is no one-click `List-Unsubscribe` header. EU/UK recipients get a nurture sequence they never consented to. CAN-SPAM penalties apply per email. | `lib/phase2-emails.ts:40-43`, `lib/unsubscribe.ts:99-111` |
| 9 | **No error tracking or alerting anywhere** | Every failure path ends in `console.error`. The code comments record that paid orders were silently dropped for 91 days before anyone noticed. Some paid-order failure paths still return 200 to Stripe, so Stripe does not even retry. | section 5 |
| 10 | **The EU/UK digital-withdrawal waiver depends on a consent step that does not exist** | The terms say buyers "provide express consent" to waive the 14-day withdrawal right on PDFs, but no checkout step collects that consent. Without it, the waiver probably fails, and EU/UK buyers keep a 14-day refund right. The terms are also browsewrap (no checkbox, no link at checkout), so the liability cap and governing-law clause may not bind anyone. | `app/terms/page.tsx:35,39` |

---

## 1. Personal data collected, and where it is stored

### 1.1 What the form collects (`app/create/page.tsx`)

| Field | Required | Client cap | Server cap | Notes |
|---|---|---|---|---|
| Child's first name | yes | 50 chars | **none** | Also pre-filled from `?name=` in the URL (`:86-90`) |
| Child's age | yes | 1–16 | **none** | |
| Behaviour rating 1–10 ("Very naughty 😈" … "Perfectly nice") | yes | slider | **none** | A judgement about a named child |
| "What has Santa noticed this year?" | no | 500 | **none** | Free text about the child |
| Up to 3 wishes | ≥1 | 100 each | **none** | |
| "🤫 Secret note to Santa" (parent notes) | no | 300 | **none** | **Most sensitive field.** The placeholder invites things like "going through a tough time at school". Parents will type health, family and emotional details here. |
| Parent email | yes | 120 | loose `includes('@')` | Framed as the delivery address. **Never verified.** |
| Letter language | yes | whitelist | falls back to English | |

At Stripe checkout: the card (held by Stripe only), the email, and for physical or bundle orders the **full shipping name and address**.

Collected implicitly: the referral code from `?ref=`, the IP address and device data (through the third parties in section 2), and anything the session replay tool records.

**No notice at the point of collection.** The form has no privacy link, no "I am this child's parent or guardian" confirmation and no terms checkbox. The Terms require users to be 18+ (`app/terms/page.tsx:29`), and nothing asks.

### 1.2 Server-side storage (Supabase Postgres)

| Table | Personal data columns | Written by | Retention |
|---|---|---|---|
| `letters` | `child_name`, `child_age`, `child_data` (JSONB: **the whole form, including `parentNotes`, `behaviorNotes` and a second copy of the email**), `letter_text` (Claude's output, which restates all of it), `email`, `language`, `referral_code`, `referred_by_code`, `upgrade_token`, `unsubscribed`, `phase2_*_sent_at`, `premium_pdf_sent_at` | `lib/storage.ts:109-128` | **Indefinite.** No deletion code exists. |
| `scheduled_letters` | `child_name`, `recipient_email`, `shipping` (JSON: name, 2 address lines, city, state, zip, country), `letter_content`, `child_info` (**another full copy of the form, parent notes included**), `stripe_session_id` | `app/api/webhook/route.ts:184-238` | Indefinite. Rows are kept after mailing. |
| `subscribers` | `email`, `source`, `unsubscribed`, `unsubscribed_at` | `app/api/subscribe/route.ts:31-33` | Indefinite |
| `webhook_sessions` | `stripe_session_id`, `letter_id`, `tier` (the letter id embeds the child's name, see 1.5) | `lib/storage.ts:300-303` | Indefinite |

Access posture: all server code uses the service-role key. According to the code comments, `letters` and `webhook_sessions` have RLS on with no policies. **The repo has no RLS evidence for `subscribers` or `scheduled_letters`.** `scheduled_letters` holds addresses and should be verified first.

### 1.3 Browser storage

- `sessionStorage`: `santaChildInfo` (the full form, parent notes included), `santaEmail`, `santaLanguage`, `santaLetterText`, `santaLetterId`, `santaReferralCode`, `earlybird`, `banner_dismissed`, `exit_popup_shown`
- `localStorage`: `santaRef` (referral code, 30-day TTL)
- Cookies: set by the Meta Pixel (`_fbp`) and Contentsquare. First-party code sets none.

### 1.4 Supabase Storage bucket `lob-letters`: ⚠ LEGAL RISK

- **Stannp era (current):** the PDF of the physical letter, which contains the **child's name, the full mailing address and the full letter text**. Named `letter-{child-name}-{ms}-{6 random}.pdf` (`lib/stannp.ts:192`).
- **Lob era (April–September 2026):** the HTML of the same content, named `letter-{child-name}-{ms}.html`. **It has no random suffix** (`lib/lob.ts:32`). If you know a child's name and roughly when the order was placed, the URL is guessable.
- URLs come from `getPublicUrl()`, and Stannp fetches them without credentials, so **the bucket must be public for mailing to work.** Every file is readable, forever, by anyone who has or can guess the URL. Nothing ever deletes them.
- Supabase database backups typically do not include Storage objects. Confirm this for the current plan.

### 1.5 Personal data leaking through identifiers and URLs

- **Letter id** = the first 8 characters of the child's name + a timestamp + random (`lib/storage.ts:418-423`). It appears in `success_url` and `cancel_url` (`lib/stripe.ts:72,96`) and in Stripe metadata.
- **`/create?name=<child name>`** is generated by the homepage name box (`app/page.tsx:157`).
- Both URLs load on pages where the Meta Pixel fires `PageView`, which sends the full URL to Meta. Contentsquare and Vercel Analytics receive them too. **In effect, children's first names are being sent to an ad network.**
- Stripe metadata holds `childName`, `letterId` and `recipientEmail` (`lib/stripe.ts:98-105`).

### 1.6 Third parties that receive personal data

| Recipient | What it gets | In the privacy policy? |
|---|---|---|
| Anthropic | Name, age, behaviour rating, behaviour notes, wishes, **parent's secret note** | Listed, but described as getting "no personal identifiers" (false) |
| Resend | Email, child name in subject and body, full letter, PDF attachment, shipping address (address-check email) | Yes |
| PDFShift | Full letter HTML with child name. For physical orders, also the mailing address | **No** |
| Stannp | Recipient name, address, PDF URL | **No** (Lob is listed instead) |
| Lob (historical) | Same, April–September 2026. Retention at Lob is unknown | Yes, but out of date |
| Stripe | Email, address, card, child name and letter id in metadata | Yes |
| Meta | Page URLs (child names, see 1.5), Lead and Purchase events with values, IP, `_fbp`. Possibly hashed email if Automatic Advanced Matching is on | Yes, but described as "anonymised" |
| Contentsquare | Session recordings of every page, including `/preview`, which renders the child's letter | **No** |
| Vercel | Analytics (URLs), **function logs** containing child names, emails, letter ids and Supabase error bodies (for example `webhook/route.ts:119`, `send-letters/route.ts:236`) | Hosting and analytics are listed. Logs are not |
| Google Fonts | Visitor IP on every page load (`app/layout.tsx:59`). PDFShift's renderer also fetches Google Fonts | **No** |

### 1.7 Data subject rights

There is no deletion or export tooling. A single deletion request today means manual work across `letters`, `scheduled_letters`, `subscribers`, `webhook_sessions`, the storage bucket, Stripe, Resend logs, Vercel logs, Meta, Contentsquare and Lob. The privacy policy promises a 30-day response under GDPR.

---

## 2. Third-party scripts and SDKs

### 2.1 In the browser

| Script | Loaded from | Pages | Fires before consent? | Notes |
|---|---|---|---|---|
| Meta Pixel (`connect.facebook.net/en_US/fbevents.js`) | `app/layout.tsx:62-81`, `afterInteractive` | **All** (production only) | **Yes. There is no consent mechanism at all.** | Fires `PageView` immediately. `Lead` on `/preview` (`preview/page.tsx:480`), `Purchase` with amount on `/success` (`success/page.tsx:86`), `VideoWaitlistSignup` on `/video`. Automatic Events and Advanced Matching are configured in Meta and invisible from here. If Advanced Matching is on, the email typed on `/create` is hashed and sent. |
| Contentsquare session replay (`t.contentsquare.net/uxa/9173e4f5bea3d.js`) | `app/layout.tsx:82-88`, `afterInteractive` | **All** (production only) | **Yes** | Added 2026-06-14 (`824de69`) and never added to the privacy policy. Records the form pages and the rendered letter unless masking is configured. **This is the script most likely to draw a CIPA claim.** |
| Vercel Analytics (`@vercel/analytics`) | `app/layout.tsx:90` | All | Yes | Cookieless, lower risk, still receives URLs |
| Google Fonts CSS and font files | `app/layout.tsx:57-59` | All | Yes | Sends the IP to Google. A German court has awarded damages over exactly this (LG München, 2022), so it matters for EU visitors. |

There is **no cookie banner, consent manager, GPC handling or "Do Not Sell or Share" link** anywhere in the codebase.

### 2.2 Server-side SDKs and APIs

| Service | Package or endpoint | Used in |
|---|---|---|
| Anthropic | `@anthropic-ai/sdk`, model `claude-opus-4-5` | `app/api/generate/route.ts:47`. `lib/claude.ts` is dead code. |
| Stripe | `stripe` (API version pinned `2024-06-20`) | `lib/stripe.ts`, `app/api/webhook`, `app/api/checkout*` |
| Supabase | `@supabase/supabase-js` plus raw PostgREST `fetch` | `lib/storage.ts`, `lib/unsubscribe.ts`, crons, webhook |
| Resend | `resend` | `lib/resend.ts`, `lib/phase2-emails.ts`, `app/api/subscribe` |
| Stannp | REST `api-us1.stannp.com` | `lib/stannp.ts` |
| PDFShift | REST `api.pdfshift.io` | `lib/pdf.ts`, `lib/stannp.ts` |
| Lob | REST (dead code, `LOB_API_KEY`) | `lib/lob.ts`, no longer imported |
| `puppeteer-core`, `@sparticuz/chromium-min` | installed | Not imported anywhere, apparently unused |

---

## 3. Outbound email

All email is sent through Resend. None of it sets a `List-Unsubscribe` / `List-Unsubscribe-Post` header, and **none includes a physical postal address.** The only location given is "Made with ❤ in San Francisco", which does not meet CAN-SPAM's requirement for a valid postal address in commercial email.

| # | Email | From | Trigger | Kind | Unsubscribe link? |
|---|---|---|---|---|---|
| 1 | "🎅 A letter from Santa, just for {child}" | santa@ | `POST /api/generate` with any email (`generate/route.ts:117-129`) | Mixed: the letter plus a $9 upsell plus a referral ask. The primary purpose is arguably commercial. | ✅ `lib/resend.ts:100` |
| 2 | "🎁 Order confirmed — {child}'s letter is on its way!" | santa@ | Stripe `checkout.session.completed` (`webhook/route.ts:249`) | Transactional | ❌ (acceptable). **Promises a "we'll email you when it ships" message that does not exist** (`lib/resend.ts:161`). |
| 3 | "🎁 {child}'s official letter from Santa — your PDF is here!" | santa@ | The webhook for premium or bundle, **and** the referral grant to both referee and referrer (`lib/fulfillment.ts`) | Transactional or promotional | ❌ |
| 4 | "✉️ Quick check on the address for {child}'s letter" | santa@ | Webhook, when Stannp rejects an address. The hourly cron sends one reminder (`send-letters/route.ts:145-184`). | Transactional | ❌ (acceptable) |
| 5 | "I told Mrs. Claus about {child}" | santa@ | Daily cron at 11:00 UTC, 3 days after the letter, if unpaid (`cron/phase2`) | Relationship or marketing | ✅ `phase2-emails.ts:42` |
| 6 | "About {child}'s letter..." | santa@ | Same cron, day 7 | **Marketing** (upgrade CTA) | ✅ |
| 7 | "One more thing about {child}'s letter" | santa@ | Same cron, day 14 | **Marketing** | ✅ |
| 8 | "🎬 You're on the list — Personalised Santa Video…" | hello@ | `POST /api/subscribe` with `source=video_waitlist` | Confirmation plus promo | ✅, plus a privacy link |
| 9 | "🎄 Your 5 Magical Christmas Activities…" | hello@ | `POST /api/subscribe` (lead magnet) | Lead magnet plus promo | ✅, plus a privacy link |

Problems:

- **Unsubscribe can fail silently.** `markUnsubscribed` never checks the PATCH responses (`lib/unsubscribe.ts:99-111`), so the page reports success regardless. `isUnsubscribed` treats a failed lookup as "subscribed" (`:63-80`), and the phase-2 cron then sends. Both failures point toward sending more mail.
- **Unsubscribe happens on GET** (`app/unsubscribe/page.tsx:20-29`). Corporate link scanners can unsubscribe people who never clicked. This is a lower risk, but it corrupts the data.
- **No email verification.** Emails 1 and 5–7 go to whatever address was typed, with a child's name in the subject line. Anyone can point four emails from "Santa Claus" at a stranger.
- **HTML injection:** in email 1, `child.name` and the letter text are interpolated without escaping (`lib/resend.ts:58,76`), and so are emails 2–4. The phase-2 emails do escape (`phase2-emails.ts:8`). The server does not cap the name's length.
- **No EU/UK marketing consent.** Emails 5–7 and the upsell in email 1 go to EU/UK addresses with no opt-in. The privacy policy itself names consent as the lawful basis for marketing (`privacy/page.tsx:93`).
- **No bounce or complaint handling.** No Resend webhook is consumed, so hard bounces and spam complaints keep getting mailed.

---

## 4. Supabase backups

**Nothing about backups is configured, scripted or documented in this repository.** Specifically:

- There is no `supabase/config.toml`, no `pg_dump` job, no export cron, and no mention of backups or PITR anywhere.
- **The schema is not in version control.** `letters`, `subscribers` and `scheduled_letters` have no `CREATE TABLE`. Only `supabase/webhook_sessions.sql` and `supabase/referrals.sql` exist. If the project were lost, the database could not be rebuilt from this repo.
- Storage bucket objects (the letter PDFs that `scheduled_letters` rows point to) are generally **not** included in Supabase database backups.
- `TESTING.md` records that **there is no staging project**. Every local `next dev` run reads and writes production with the service-role key. The local `.env.local` also holds the production Supabase service-role key, the Stripe secret key, the Stannp key and the Anthropic key. That laptop is part of the production attack surface.

What to check in the dashboard: the plan tier (the Free tier has no restorable backups), the daily backup window and whether PITR is enabled. Also check whether a restore has ever been tested.

---

## 5. Error tracking and alerting

**There is none.** No Sentry, Datadog, Logtail, Axiom, Better Stack, Slack webhook, PagerDuty or `instrumentation.ts`. Every failure path writes `console.error` / `console.warn` to Vercel function logs and nothing reads them. Some messages are formatted to be noticed (`🚨 PAID ORDER WITH NO LETTER`, `🚨 MAILED BUT NOT RECORDED`), but nothing routes them anywhere.

The code itself records the consequence. `app/api/webhook/route.ts:65-67` and `lib/storage.ts:52-55` both describe paid orders silently lost **for 91 days** because a broken key looked like a missing row.

`next.config.mjs` also sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`, so type errors reach production without failing the build.

### 5.1 Stripe webhook (`app/api/webhook/route.ts`)

| Failure | What happens | Who finds out |
|---|---|---|
| Bad signature | 400 and a log line | Nobody |
| **No email on the session** (`:45-48`) | **Returns 200.** Stripe considers the event delivered, and the order is dropped. | Nobody. The customer paid and receives nothing. |
| Letter row not found | 500, Stripe retries for about 3 days | Only via Stripe's own failing-endpoint emails, if someone reads them |
| **Physical order with no shipping address** (`:242-244`) | Logs, then **continues, sends the confirmation and marks the order fulfilled** | Nobody |
| **`addChild` tier** | No fulfilment branch. Confirmation sent, marked fulfilled, **nothing delivered** | Nobody |
| PDFShift, Resend, Stannp or Supabase error | 500, Stripe retries. Per-session guards make retries safe. | Stripe's retry emails only |
| `session.metadata!` is null (for example a Payment Link or a dashboard-created session) | Throws before the try block, 500 | Stripe retry emails |

### 5.2 Stannp and physical mail (`app/api/cron/send-letters/route.ts`)

- A failed send is counted as `failed` in the JSON response and logged. The row stays `sent=false` and is **retried every hour with no limit.** Every retry pays for another PDFShift render and another storage upload. There is no retry counter, dead-letter state or alert.
- `🚨 MAILED BUT NOT RECORDED` (`:226-233`) means the next run will **mail the same child a second letter**, and that condition exists only as a log line.
- An invalid address is held, gets one reminder, and then waits forever for a manual fix that nothing prompts anyone to make.
- There is no row-level claim or lock. If two runs overlap (a manual trigger or a duplicated cron invocation), the same letter can be posted twice.
- No Stannp status or returned-mail webhook is consumed, so returned or undeliverable letters are invisible.

### 5.3 Anthropic API (`app/api/generate/route.ts`)

- An error returns a generic 500 to the user and `console.error(err)`. There is no tracking of the failure rate, no alert on credit exhaustion or rate limiting, and no explicit timeout (the SDK default applies).
- The storage failure after generation is `console.warn` (`:110-112`). **The user gets a letter, but no row is saved**, so any later purchase hits "letter not found" in the webhook.
- The email failure is `console.warn` (`:126-128`).
- The model's output is not checked or moderated before being shown, emailed, rendered to PDF or **posted to a child** (see 7.3).

---

## 6. Legal pages

Three pages exist, and they are linked from the homepage and `/video` footers. **They are not linked from `/create`, `/preview` or checkout, and are never accepted.**

| Page | Last updated | Covers |
|---|---|---|
| `/privacy` | May 2, 2026 | Collection, use, a COPPA paragraph, processors, retention, CCPA, GDPR/UK GDPR, cookies (Vercel Analytics and the Meta Pixel), security, contact `privacy@santasletter.ai`, "California, United States" |
| `/terms` | May 2, 2026 | The service, 18+ eligibility, payments and refunds, EU withdrawal waiver, delivery via Lob, acceptable use, IP (including "we retain the right to use anonymised letter content to improve our AI models"), no warranty, a 30-day liability cap, California law |
| `/refunds` | April 19, 2026 | PDF sales final, physical dispatch in 1–2 days, delivery estimates, the "Christmas Delivery Guarantee" heading, reprint or refund if not received |

There is **no** cookie policy, "Do Not Sell or Share" page, accessibility statement, CCPA notice at collection, children's-data notice for parents, or list of subprocessors.

### 6.1 Where the pages contradict the code (⚠ LEGAL RISK)

| Page says | Reality |
|---|---|
| Anthropic receives "letter content only, no personal identifiers" (`privacy:57`) | It receives the child's name, age, behaviour notes and the parent's private note |
| "We do not store child information beyond what is necessary to fulfil your order" (`privacy:48`), and it is "retained only as long as needed" (`privacy:68`) | Stored forever in three places, including free letters with no order at all, and reused for marketing emails |
| Physical letters go through Lob.com, "shipping address only" (`privacy:28,59`, `terms:45`) | Stannp since September 2026, plus PDFShift. Both receive the whole letter. Neither is disclosed. |
| Tracking is limited to Vercel Analytics and the Meta Pixel (`privacy:101-105`) | Contentsquare session replay also runs and is undisclosed. Google Fonts is undisclosed. |
| Vercel Analytics data is "anonymised", and Pixel use is "limited, anonymised data" (`privacy:42,104`) | The Pixel receives URLs containing children's names, plus identifiers and IPs |
| We send "transactional emails related to your order" (`privacy:38`) | Also a three-email marketing sequence to non-buyers |
| FAQ: "we never share it with third parties for marketing, and we comply with COPPA" (`app/page.tsx:122`) | The Meta Pixel is a marketing share |
| "Printed and dispatched within 1–2 business days" (`refunds:27`, `app/page.tsx:119`, `success/page.tsx:159`) | Held until at least Nov 22, 2026, by design (`webhook/route.ts:173-176`). The preview modal correctly says "mailed in late November". |
| "Christmas Delivery Guarantee" as a heading, with "cannot guarantee" in its body (`refunds:38-41`) | The success page says "Delivery guaranteed before Christmas Eve" (`success:160`). Preview says "Christmas Eve Guaranteed" (`preview:632`). The homepage says "guaranteed Christmas delivery" (`page.tsx:333`). |
| "All PDF sales are final" (`refunds:19`, `terms:35`) | The upgrade page says "Money-back if you're not delighted" (`upgrade/[token]/page.tsx:126`) |
| EU buyers "provide that express consent" to waive withdrawal (`terms:39`) | No UI collects it |
| "Hand-stamped letter/envelope" (`UpgradeButtons.tsx:41,53`, `preview:655`, `lib/resend.ts:161`) | Printed and posted by Stannp with metered First Class postage |
| "We'll email you the moment it ships" (`lib/resend.ts:161`) | No shipping email exists |
| Waitlist "Launching October 2026" with a "$34.99" strikethrough (`video:66,147`) | Seven days to October, with no product in the repo and no price ever charged |

### 6.2 COPPA, in context

COPPA mainly governs data collected **from** children under 13. A parent typing in data about their own child sits mostly outside it, and the site's framing ("designed for parents") is reasonable. The real exposure is **the gap between what the policy promises and what the code does**, which is the FTC's usual route (Section 5 deception). Children's data makes that gap look worse. On top of that, state laws treat minors' data specially. CCPA, for example, requires opt-in before "selling or sharing" data of consumers known to be under 16, and the Pixel receives children's first names.

---

## 7. Anthropic rate limiting and spend controls

**None in the application.**

| Control | Status |
|---|---|
| Per-IP or per-email rate limit | ❌ None. There is no `middleware.ts` and no Upstash/KV. |
| Auth, CAPTCHA or Turnstile | ❌ None. `/api/generate` is a public POST. |
| Server-side input validation | ❌ Only `name` and `age` are checked for presence. `behaviorNotes`, `parentNotes`, `wishes` and `name` have **no server-side length cap**. The browser `maxLength` values are trivially bypassed. Input tokens per call are bounded only by the request body limit and the model's context window. |
| Output cap | ✅ `max_tokens: 1200` |
| Model choice | `claude-opus-4-5`, the most expensive tier, for a roughly 380-word letter |
| Timeout or retry policy | SDK defaults (it retries automatically, which multiplies cost during incidents) |
| Budget ceiling | Nothing in code. Check whether a monthly spend limit is set in the Anthropic Console. It is the only backstop. |
| Usage monitoring | ❌ None |

### 7.1 Cost amplification beyond Anthropic

Each unauthenticated `/api/generate` call triggers:

- one Opus call
- one Supabase row
- one Resend email now, plus three more scheduled (days 3, 7 and 14)

The **referral loop** multiplies PDFShift and Resend spend. Each generated letter gets a new code, and each code can earn 5 grants. Every grant renders **two** PDFs and sends **two** emails. The self-referral guard is an exact email match (`lib/referral-grant.ts:77-81`), so `a+1@`, `a+2@` and so on get past it. A script can chain fake referrals indefinitely.

### 7.2 Unbounded retries elsewhere

The Stannp cron re-renders failing letters through PDFShift every hour, forever (see 5.2).

### 7.3 Content safety (related)

Parent-supplied free text goes straight into the prompt, and the output is not moderated. It is shown on screen, emailed, rendered to PDF and **posted to a child** under the "Santa Claus" name. A hostile adult, for example in a custody dispute, or a jailbreak through `parentNotes`, could put harmful content in a child's mailbox. The terms forbid this, but nothing enforces it.

---

## Appendix: other findings

- `app/api/checkout` "legacy flow" accepts `letterId`, `childName` and `recipientEmail` from the client. Anyone who knows a letter id can buy that letter's PDF sent to their own inbox. Letter ids are hard to guess, so this is low risk, but the id is sent to Meta (see 1.5).
- `/upgrade/[token]` is not in `robots.ts` disallow and has no `noindex`. Tokens are UUIDs, so this is low risk, but these pages show a child's name and the first paragraph of their letter.
- `EarlyBirdBanner` is never rendered, `lib/claude.ts` and `lib/lob.ts` are dead, and `puppeteer-core` and `@sparticuz/chromium-min` are installed but not used.
- The Stripe promo window logic (`lib/stripe.ts:53-65`) uses server-local month/day and has no year, so it will silently re-activate the early-bird promo every January–August.
