# Compliance Sprint: Code Locations

**Audited:** 2026-09-23, at commit `a01a66c` on `main`. The review was read-only and no code was changed.
**Purpose:** a map of exact file and line locations for the compliance fixes, to be used alongside `AUDIT.md`. This file does not propose fixes.

All line numbers refer to the files as they stand at this commit.

---

## 1. Where the Contentsquare script loads

**`app/layout.tsx:83-87`**, rendered inside `<body>` and gated at line 82.

```tsx
82:  {IS_PRODUCTION && (
83:    <Script
84:      id="contentsquare"
85:      src="https://t.contentsquare.net/uxa/9173e4f5bea3d.js"
86:      strategy="afterInteractive"
87:    />
88:  )}
```

- The only gate is `IS_PRODUCTION`, defined at `app/layout.tsx:7` as `process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'`. No consent check exists.
- Because the tag sits in the root layout, it runs on **every page**.
- This is the only reference to Contentsquare in the codebase.

---

## 2. Where the Meta Pixel loads, and every `fbq()` call

### 2.1 Where it loads

**`app/layout.tsx:63-80`**. An inline `<Script id="meta-pixel" strategy="afterInteractive">` writes the loader, gated at line 62.

```tsx
62:  {IS_PRODUCTION && PIXEL_ID && (
63:    <Script
64:      id="meta-pixel"
65:      strategy="afterInteractive"
...
75:      'https://connect.facebook.net/en_US/fbevents.js');   // remote script injected here
76:      fbq('init', '${PIXEL_ID}');
77:      fbq('track', 'PageView');
```

- The gates are `IS_PRODUCTION` (`app/layout.tsx:7`) and `PIXEL_ID` (`app/layout.tsx:6`, `process.env.NEXT_PUBLIC_META_PIXEL_ID`). No consent check exists.
- The tag is in the root layout, so it runs on **every page**.
- Lines 69 and 71 reference `f.fbq` and `f._fbq` inside Meta's loader stub. They define the function and do not call it.

### 2.2 Every `fbq()` call

| # | Location | Call | Fires when |
|---|---|---|---|
| 1 | `app/layout.tsx:76` | `fbq('init', '${PIXEL_ID}')` | Every page load (production) |
| 2 | `app/layout.tsx:77` | `fbq('track', 'PageView')` | Every page load (production). Sends the full URL. |
| 3 | `lib/pixel.ts:32` | `window.fbq('track', eventName, params)` inside `trackEvent()` | See callers below |
| 4 | `lib/pixel.ts:52` | `window.fbq('trackCustom', eventName, params)` inside `trackCustomEvent()` | See callers below |

`lib/pixel.ts` has its own `IS_PRODUCTION` guard at line 16, enforced at lines 27 and 47. Neither wrapper checks for consent.

**Callers of the wrappers** (these are the indirect `fbq()` calls):

| Location | Call | Event data sent to Meta |
|---|---|---|
| `app/preview/page.tsx:480` | `trackEvent('Lead', { content_name: 'free_letter_completed' })` | Fires after `/api/generate` succeeds |
| `app/success/page.tsx:86-91` | `trackEvent('Purchase', { value, currency, content_name: tier, content_type: 'product' })` | The amount comes from `/api/checkout-total` (`app/success/page.tsx:72`) |
| `app/video/page.tsx:24` | `trackCustomEvent('VideoWaitlistSignup')` | Fires after `/api/subscribe` succeeds |

No other file references `fbq`, `trackEvent` or `trackCustomEvent`.

---

## 3. The `addChild` tier

### 3.1 Definition in `lib/stripe.ts`

The exact tier string is **`addChild`**. It is the object key at **`lib/stripe.ts:23`**:

```ts
23:  addChild: {
24:    priceId: 'price_1TJe607Eq8l4ZGZZ44a4C3ad',
25:    amount: 1500,
26:    label: 'Add a Child',
27:  },
```

- Tiers are looked up by that key at `lib/stripe.ts:47` (`PRICES[tier as keyof typeof PRICES]`).
- `needsShipping` at `lib/stripe.ts:50` is true only for `physical` and `bundle`. For `addChild` it is **false**, so Stripe collects **no shipping address** (`lib/stripe.ts:80-84`).
- The tier string goes into `success_url` at `lib/stripe.ts:96` and into session `metadata.tier` at `lib/stripe.ts:99`.

### 3.2 Checkout flow (where the string enters)

| Location | What happens |
|---|---|
| `app/preview/page.tsx:149` | `'Add a child': 'addChild'` in `TIER_MAP` |
| `app/preview/page.tsx:656` | The card is labelled "Add a child", priced `+$15`, described as "Another child gets their own magical letter" |
| `app/preview/page.tsx:658` | `const tier = TIER_MAP[opt.label]` resolves to `'addChild'` |
| `app/preview/page.tsx:672` → `:497-503` → `:507` | `handleCheckoutClick('addChild')` goes straight to `proceedToCheckout`, with no date modal because the tier is not physical |
| `app/success/page.tsx:104` | `tier: 'addChild'`, the literal string in the post-purchase upsell |
| `app/success/page.tsx:105` | `letterId: letterId \|\| 'upsell'`. When `letter_id` is missing from the URL, the literal `'upsell'` becomes the letter id. |
| `app/success/page.tsx:106` | `childName: 'Additional Child'`. The placeholder is sent as the child's name. |
| `app/success/page.tsx:107` | `recipientEmail: ''`. This empty value fails the required-field check in the checkout route (next row), so this call never creates a Stripe session. |
| `app/success/page.tsx:185` | The copy reads "Add a personalised letter for another child for just $15. Same magic, delivered to the same address." |
| `app/api/checkout/route.ts:8,33-44` | `tier` passes through unvalidated. The legacy branch accepts `letterId`, `childName` and `recipientEmail` from the client. Note: the success-page call sends `recipientEmail: ''`, which fails the check at `:33`, so **the success-page upsell returns 400 and never reaches Stripe**. The preview-page path sends the real email and does reach Stripe. |

### 3.3 Webhook flow (`app/api/webhook/route.ts`)

The literal `'addChild'` **never appears** in the webhook. The tier arrives as `session.metadata.tier` at line 40 and falls through every branch:

| Line | Behaviour for `tier === 'addChild'` |
|---|---|
| `:40` | `tier` is read from metadata |
| `:84` | `claimWebhookSession(session.id, resolvedLetterId, 'addChild')` records the session |
| `:100` | `if (tier === 'premium' \|\| tier === 'bundle')` is **skipped**, so no PDF is sent |
| `:131` | `if (tier === 'physical' \|\| tier === 'bundle')` is **skipped**, so no letter is mailed or scheduled |
| `:249` | `sendOrderConfirmationEmail(recipientEmail, childName, 'addChild', …)` is **sent** |
| `:256` | `mergeTier(letterData.tier, 'addChild')` is called. For a letter with no prior tier, this returns `'addChild'` (`lib/storage.ts:256`). |
| `:257` | `markLetterFulfilled(resolvedLetterId, nextTier)` sets `fulfilled = true` on the original letter, which also removes it from the phase-2 nurture query (`app/api/cron/phase2/route.ts:77`) |
| `:267` | `markSessionCompleted` closes the session |

Supporting code:
- `lib/storage.ts:239-244`: `tierGrants('addChild')` returns `{ premium: false, physical: false }`.
- `lib/storage.ts:254-256`: the comment and code "Neither grants a letter entitlement (addChild, or an unknown tier)" return the incoming tier unchanged.

The order-confirmation email renders the tier for `addChild` as follows (`lib/resend.ts`):
- `:127-131`: `tierLabels` has no `addChild` key.
- `:147` and `:151`: the output falls back to `tierLabels[tier] || tier`, so the raw string **`addChild`** appears in the customer's email (for a purchase from `/preview`: "{child}'s addChild is being prepared…").
- `:133-134`: `includesPDF` and `includesPhysical` are both false.

### 3.4 Success flow

- `app/success/page.tsx:63`: `tier` is read from the URL (`addChild` after an add-child purchase).
- `app/success/page.tsx:89`: it is sent to Meta as `content_name: 'addChild'` in the `Purchase` event.

---

## 4. Unescaped child names in email HTML

### 4.1 `lib/resend.ts`

**This file has no escaping function.** Every interpolation below is raw. Subject lines are not HTML, but they are listed because the same value reaches the recipient.

| Line | Function | Context | Interpolation |
|---|---|---|---|
| 57 | `sendFreeLetterEmail` | subject | `${letter.child.name}` |
| **76** | `sendFreeLetterEmail` | **HTML body** | `Dear ${letter.child.name},` |
| 139 | `sendOrderConfirmationEmail` | subject | `${childName}` |
| **147** | `sendOrderConfirmationEmail` | **HTML body** | `${childName}'s ${tierLabels[tier] \|\| tier} is being prepared…` (the tier is also raw) |
| **152** | `sendOrderConfirmationEmail` | **HTML body** | `For: ${childName}` |
| **161** | `sendOrderConfirmationEmail` | **HTML body** | `Santa's elves will keep ${childName}'s letter safe…` |
| 194 | `sendPremiumPDFEmail` | subject | `${childName}` |
| 197 | `sendPremiumPDFEmail` | attachment filename | `Santas-Letter-${childName.replace(/\s+/g, '-')}.pdf` |
| **218** | `sendPremiumPDFEmail` | **HTML body** | `${childName}'s letter is ready!` |
| **225** | `sendPremiumPDFEmail` | **HTML body** | `📎 Santas-Letter-${childName.replace(/\s+/g, '-')}.pdf` |
| 283 | `sendAddressCheckEmail` | subject | `${childName}` |
| **291** | `sendAddressCheckEmail` | **HTML body** | `Your order for ${childName} is safe and paid for…` |

Where the value comes from:
- `sendFreeLetterEmail` gets it from the raw request body of `POST /api/generate` (`app/api/generate/route.ts:26,119`). The server does not validate its length or content.
- `sendOrderConfirmationEmail` and `sendAddressCheckEmail` (webhook) get `session.metadata.childName` (`app/api/webhook/route.ts:40,197,249`). In the legacy checkout this is **supplied by the client** (`app/api/checkout/route.ts:8,40`, `lib/stripe.ts:101`).
- `sendAddressCheckEmail` (cron) gets `scheduled_letters.child_name` (`app/api/cron/send-letters/route.ts:160`).
- `sendPremiumPDFEmail` gets `letters.child_data.name` (`lib/fulfillment.ts:24`).

Other unescaped values in the same file, outside the scope of this item but in the same HTML:
- `:21-25`: the letter text paragraphs. Only `*` is stripped.
- `:295`: the shipping address lines.

### 4.2 `lib/phase2-emails.ts`

**Every HTML-body interpolation is escaped.** `escapeHtml` is defined at line 8, and each function escapes the name before using it in the body:

| Function | Escaped at | Body uses (escaped) |
|---|---|---|
| `sendMrsClausEmail` | `:102` | `:107`, `:110` |
| `sendKeepsakeUpgradeEmail` | `:141` | `:147`, `:150` |
| `sendPhysicalMailPreviewEmail` | `:183` | `:189`, `:192`, `:198` |

The **unescaped** uses are in subject lines only, using `letter.child.name` rather than the escaped `childName`:

| Line | Function | Context | Interpolation |
|---|---|---|---|
| 119 | `sendMrsClausEmail` | subject | `I told Mrs. Claus about ${letter.child.name}` |
| 161 | `sendKeepsakeUpgradeEmail` | subject | `About ${letter.child.name}'s letter...` |
| 204 | `sendPhysicalMailPreviewEmail` | subject | `One more thing about ${letter.child.name}'s letter` |

---

## 5. The Anthropic call in `app/api/generate/route.ts`

**`app/api/generate/route.ts:47`**

```ts
47:    const message = await client.messages.create({
48:      model: 'claude-opus-4-5',
49:      max_tokens: 1200,
```

- The client is constructed at `:7` (`const client = new Anthropic()`) and imported at `:2`.
- The prompt is assembled inline from `:52` to `:81`. It interpolates `child.name` (`:64`), `child.age` (`:65`), `child.behaviorRating` (`:66`), `child.behaviorNotes` (`:67`), the wish list (`:69`) and `child.parentNotes` (`:70`).
- The only input validation before the call is at `:33-35` (`!child?.name || !child?.age`).

`lib/claude.ts:31` contains a second `client.messages.stream(...)` call, inside `streamSantaLetter`. Nothing imports it, so it is dead code.

---

## 6. `console.error` / `console.warn` call sites

### 6.1 `app/api/webhook/route.ts` (7)

| Line | Level | Message | Outcome |
|---|---|---|---|
| 34 | error | `'Webhook signature failed:'` | Returns 400 |
| 46 | error | `'No recipient email found in session metadata or customer_details'` | **Returns 200. Stripe treats the paid order as delivered.** |
| 68 | error | `🚨 PAID ORDER WITH NO LETTER — session=… letterId=… upgradeToken=…` | Returns 500, Stripe retries |
| 198 | warn | `⚠️ Address rejected by Stannp for ${childName} …` | Order held and address email sent. Returns 200. |
| 243 | error | `'No shipping address found for physical order'` | **Continues. Confirmation is sent and the letter is marked fulfilled.** |
| 252 | warn | `⏸️ ${tier} for ${childName} awaiting address confirmation — not marked fulfilled` | Informational |
| 281 | error | `Fulfillment error for session ${session.id}:` | Returns 500, Stripe retries |

The file has 7 call sites in total (4 `error`, 3 `warn`). The table above lists all of them.

### 6.2 `app/api/generate/route.ts` (3)

| Line | Level | Message | Outcome |
|---|---|---|---|
| 111 | warn | `'Letter storage unavailable:'` | **The letter is returned to the user but not saved** |
| 127 | warn | `'Email delivery failed:'` | The letter is returned. The email is lost. |
| 134 | error | `err` (bare) | Returns 500 `'Failed to generate letter'`. This covers Anthropic failures. |

### 6.3 `app/api/cron/send-letters/route.ts` (13)

| Line | Level | Message |
|---|---|---|
| 84 | warn | `Ignoring ?dueBefore=… — …` |
| 90 | warn | `🧪 TEST MODE: due cutoff overridden to …` |
| 113 | error | `'Error fetching scheduled letters:'` (returns 500) |
| 147 | warn | `reminder skipped for …: scheduled_letters.address_reminder_sent column is missing …` |
| 155 | warn | `reminder skipped for …: no recipient_email on the row` |
| 164 | error | `reminder email failed for …:` |
| 174 | error | `🚨 REMINDER SENT BUT NOT RECORDED — …` |
| 194 | warn | `⚠️ Address still rejected for … — holding unsent, needs manual correction` |
| 227 | error | `🚨 MAILED BUT NOT RECORDED — letter … went to Stannp as … but the DB update failed …` |
| 239 | error | `❌ Failed to send letter for ${letter.child_name}:` |
| 255 | warn | `⏱️ Time budget reached — deferring … letters to the next run` |
| 276 | error | `'Error counting remaining letters:'` |
| 282 | warn | `⚠️ … letter(s) held back on address validation …` |

The file has 13 call sites in total (6 `error`, 7 `warn`). The table above lists all of them.

None of these three files sends any of these messages anywhere except Vercel function logs.

---

## 7. `middleware.ts` at the repo root

**It does not exist.** Checked the following:
- No `middleware.ts` or `middleware.js` at the repo root.
- No `src/` directory.
- `git ls-files` lists no file with "middleware" in its name.

The app therefore has no request-level interception point for rate limiting, consent gating or header injection.
