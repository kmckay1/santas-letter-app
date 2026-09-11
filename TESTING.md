# Testing scheduled letters against the shared database

There is no staging Supabase project. A local `next dev` run reads and writes the
**same database production uses**, so a row seeded for a test is immediately visible
to production.

That matters because the production cron is not passive:

- `/api/cron/send-letters` runs **hourly** (`0 * * * *` in `vercel.json`)
- production has **no `STANNP_TEST_MODE`**, so it posts real mail and is billed for it
- it claims any row where `sent = false AND send_after <= current_date`

A seeded row with a plausible address, left sitting across the top of the hour, will be
printed and mailed for real. A seeded row with a bad address will be mailed to nowhere.
Either way the money is spent and the row is marked sent.

**Do not rely on "the test only takes a minute".** Timing luck is not isolation.

## The pattern

### 1. Seed with a far-future `send_after`

```js
{
  send_after: '2099-01-01',                                   // production can never see this as due
  stripe_session_id: `cs_test_CRON_E2E_${Date.now()}_<label>`, // unlocks the local override
  child_name: `ZZ-TEST <label> (<what is being tested>)`,      // human-visible marker for cleanup
  sent: false,
}
```

Production filters on `send_after <= current_date`, so the row is invisible there
regardless of when the cron fires. Confirm it before running anything:

```js
await sb.from('scheduled_letters').select('id')
  .eq('sent', false).lte('send_after', new Date().toISOString().split('T')[0])
// must return 0 rows
```

### 2. Run the cron with the date override

```bash
curl "http://localhost:3000/api/cron/send-letters?dueBefore=2099-12-31" \
  -H "Authorization: Bearer $CRON_SECRET"
```

`?dueBefore=` is honoured **only** when `CRON_ALLOW_DATE_OVERRIDE=true`. That variable
belongs in `.env.local` and must **never** be added to Vercel — a valid `CRON_SECRET`
alone must not be enough to unlock it.

When active, the response carries `"testOverride": "2099-12-31"` and the log says:

```
🧪 TEST MODE: due cutoff overridden to 2099-12-31, restricted to rows with
   stripe_session_id like 'cs_test_CRON_E2E_%'. Real orders are unreachable.
```

### 3. Why the override is also restricted by session prefix

The date override alone would be **more** dangerous than the problem it solves. Every
real pending order sits at `send_after = 2026-11-22` (see `PHYSICAL_MAIL_EARLIEST_SEND`).
A local run with `?dueBefore=2099-12-31` and no further constraint would sweep up every
genuine customer order and mark it `sent = true` with a test letter id, destroying
fulfilment state for orders that were never mailed.

So the override additionally requires `stripe_session_id like 'cs_test_CRON_E2E_%'`.
Real rows are unreachable through it by construction, not by convention.

### 4. Clean up with a guarded delete

Verify every target against the markers *before* deleting, and abort the whole run if
any target fails:

```js
const ok = String(r.child_name).startsWith('ZZ-TEST')
        && r.send_after === '2099-01-01'
        && String(r.stripe_session_id).startsWith('cs_test_CRON_E2E_')
if (!ok) { console.log('ABORT'); process.exit(1) }
```

Then confirm the table and the `lob-letters` storage bucket are back to their prior
state. A guard that aborts on an unrecognised target has already paid for itself once.

## Local environment

`.env.local` needs the production secrets for the paths under test:

| variable | needed for |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | reading and writing `scheduled_letters` |
| `STANNP_API_KEY` | address validation and letter creation |
| `STANNP_TEST_MODE=true` | **stops real mail being sent from local runs** |
| `PDFSHIFT_API_KEY` | rendering the letter PDF |
| `RESEND_API_KEY` | the address reminder email |
| `CRON_SECRET` | authenticating the cron endpoint |
| `CRON_ALLOW_DATE_OVERRIDE=true` | local only — never in Vercel |

`STANNP_TEST_MODE=true` makes Stannp accept letters without printing or charging.
Test-mode letters come back with `id: 0`, so `lob_letter_id` will be `"0"` on any row
a local run marks sent — another reason not to point a local run at real rows.

For emails, send to `delivered@resend.dev` rather than a real inbox.

## Costs of a test run

A rejected address short-circuits before any paid work: no PDFShift render, no storage
upload, no Stannp call. A valid address costs one PDFShift credit plus a storage object
per letter, and in test mode no postage. Prefer a deliberately invalid address
(`99999 Nowhere Fake St, Springfield, IL 62704`) whenever the thing under test does not
need a successful send.
