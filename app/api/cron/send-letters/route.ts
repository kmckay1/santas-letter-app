import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPhysicalLetter, validateAddress } from '@/lib/stannp'
import { sendAddressCheckEmail } from '@/lib/resend'

// Each letter takes roughly 10s end to end (PDFShift render, Supabase upload,
// Stannp create). vercel.json allows this function 300s, so a batch of 25 run a
// few at a time finishes with plenty of room. Anything not reached keeps
// sent=false and is picked up by the next scheduled run.
const DEFAULT_BATCH_SIZE = 25

// Kept deliberately low: every letter fans out to PDFShift and Stannp, and
// neither one's rate limit is documented for this account.
const DEFAULT_CONCURRENCY = 3

// Stop starting new letters once this much of the run has elapsed, so a slow
// batch rolls over cleanly instead of being killed mid-send by the 300s cap.
const DEFAULT_TIME_BUDGET_MS = 240_000

// --- Test isolation -------------------------------------------------------
// Local runs talk to the same Supabase project as production, and the live
// hourly cron has no STANNP_TEST_MODE — so anything it considers due gets real
// mail at real cost. Seeded test rows therefore carry a send_after far in the
// future, which production's `send_after <= today` filter can never match.
//
// A local run reaches those rows with ?dueBefore=YYYY-MM-DD, but only when
// CRON_ALLOW_DATE_OVERRIDE is set. That variable lives in .env.local and must
// never be added to Vercel: a valid CRON_SECRET alone must not unlock it.
//
// The override is additionally constrained to rows whose stripe_session_id
// carries the test prefix. That constraint is the one that actually matters —
// without it, an override run against the shared database would sweep up real
// pending customer orders and mark them sent, destroying fulfilment state.
const TEST_SESSION_PREFIX = 'cs_test_CRON_E2E_'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function positiveIntEnv(name: string, fallback: number): number {
  const configured = Number(process.env[name])
  return Number.isInteger(configured) && configured > 0 ? configured : fallback
}

// Shape of the columns this route consumes. The address and child types are
// taken from sendPhysicalLetter itself so they cannot drift from lib/stannp.
type ScheduledLetter = {
  id: string
  child_name: string
  recipient_email: string | null
  shipping: Parameters<typeof sendPhysicalLetter>[0]
  child_info: Parameters<typeof sendPhysicalLetter>[1]
  letter_content: string
  // undefined means the column is missing (migration not run yet), which is
  // deliberately distinct from false (column present, reminder not yet sent).
  address_reminder_sent?: boolean | null
}

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron or with the correct secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  const batchSize = positiveIntEnv('SEND_LETTERS_BATCH_SIZE', DEFAULT_BATCH_SIZE)
  const concurrency = positiveIntEnv('SEND_LETTERS_CONCURRENCY', DEFAULT_CONCURRENCY)
  const timeBudgetMs = positiveIntEnv('SEND_LETTERS_TIME_BUDGET_MS', DEFAULT_TIME_BUDGET_MS)

  // Test-only: shift the due-date cutoff, restricted to seeded test rows.
  const requestedCutoff = req.nextUrl.searchParams.get('dueBefore')
  const overrideAllowed = process.env.CRON_ALLOW_DATE_OVERRIDE === 'true'
  const testOverride = Boolean(overrideAllowed && requestedCutoff && ISO_DATE.test(requestedCutoff))
  const cutoff = testOverride ? requestedCutoff! : today

  if (requestedCutoff && !testOverride) {
    console.warn(
      `Ignoring ?dueBefore=${requestedCutoff} — ` +
      (overrideAllowed ? 'not a YYYY-MM-DD date' : 'CRON_ALLOW_DATE_OVERRIDE is not set')
    )
  }
  if (testOverride) {
    console.warn(
      `🧪 TEST MODE: due cutoff overridden to ${cutoff}, restricted to rows with ` +
      `stripe_session_id like '${TEST_SESSION_PREFIX}%'. Real orders are unreachable.`
    )
  }

  // Fetch one batch of unsent letters due today or earlier. Oldest send_after
  // first so a backlog drains in the order it was scheduled rather than
  // starving the earliest orders.
  const dueBatch = supabase
    .from('scheduled_letters')
    .select('*')
    .eq('sent', false)
    .lte('send_after', cutoff)
    .order('send_after', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(batchSize)

  const { data: letters, error } = await (testOverride
    ? dueBatch.like('stripe_session_id', `${TEST_SESSION_PREFIX}%`)
    : dueBatch)

  if (error) {
    console.error('Error fetching scheduled letters:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!letters || letters.length === 0) {
    console.log('No letters due today')
    return NextResponse.json({
      sent: 0, failed: 0, processed: 0, skipped: 0, invalidAddress: 0, remindersSent: 0,
      remaining: 0, testOverride: testOverride ? cutoff : false,
      batchSize, concurrency, elapsedMs: Date.now() - startedAt,
    })
  }

  const batch: ScheduledLetter[] = letters

  console.log(
    `Found ${batch.length} letters to send ` +
    `(batch size ${batchSize}, concurrency ${concurrency})`
  )

  let sent = 0
  let failed = 0
  let skipped = 0
  let invalidAddress = 0
  let remindersSent = 0

  /**
   * One extra nudge beyond the checkout-time email, and only one. The customer
   * already got an address email when they paid; this covers the case where they
   * never acted on it. Guarded by address_reminder_sent so an hourly cron cannot
   * turn a stuck order into a stream of identical emails.
   */
  async function sendAddressReminderOnce(letter: ScheduledLetter) {
    if (letter.address_reminder_sent === undefined) {
      console.warn(
        `   reminder skipped for ${letter.id}: scheduled_letters.address_reminder_sent ` +
        `column is missing — run the migration, otherwise this would email every run`
      )
      return
    }
    if (letter.address_reminder_sent) return
    if (!letter.recipient_email) {
      console.warn(`   reminder skipped for ${letter.id}: no recipient_email on the row`)
      return
    }

    try {
      await sendAddressCheckEmail(letter.recipient_email, letter.child_name, letter.shipping)
    } catch (err) {
      // Leave the flag false so the next run tries again; a send failure should
      // not silently cost the customer their only reminder.
      console.error(`   reminder email failed for ${letter.id}:`, err)
      return
    }

    const { error: flagError } = await supabase
      .from('scheduled_letters')
      .update({ address_reminder_sent: true, address_reminder_sent_at: new Date().toISOString() })
      .eq('id', letter.id)

    if (flagError) {
      console.error(
        `🚨 REMINDER SENT BUT NOT RECORDED — ${letter.id} was emailed but ` +
        `address_reminder_sent could not be set: ${flagError.message}. ` +
        `It will be emailed again next run until this is fixed.`
      )
      return
    }

    remindersSent++
    console.log(`   📧 one-time address reminder sent for ${letter.child_name}`)
  }

  async function sendOne(letter: ScheduledLetter) {
    try {
      // Orders are held for weeks before posting, so re-check the address right
      // before it actually goes out. Fails open exactly as at checkout: only a
      // definitive rejection holds the letter back.
      const addressCheck = await validateAddress(letter.shipping)
      if (!addressCheck.ok) {
        invalidAddress++
        console.warn(
          `⚠️  Address still rejected for ${letter.child_name} (letter ${letter.id}) — ` +
          `holding unsent, needs manual correction`
        )
        await sendAddressReminderOnce(letter)
        return
      }
      if (addressCheck.reason !== 'valid') {
        console.log(`Address check skipped for ${letter.child_name}: ${addressCheck.reason} (${addressCheck.detail})`)
      }

      const result = await sendPhysicalLetter(
        letter.shipping,
        letter.child_info,
        {
          content: letter.letter_content,
          childName: letter.child_name,
          createdAt: new Date().toISOString(),
        }
      )

      // Mark as sent. If this write fails the letter has already been handed to
      // Stannp, so log loudly — the next run would otherwise mail it twice.
      const { error: updateError } = await supabase
        .from('scheduled_letters')
        .update({
          sent: true,
          sent_at: new Date().toISOString(),
          lob_letter_id: result.id,
        })
        .eq('id', letter.id)

      if (updateError) {
        console.error(
          `🚨 MAILED BUT NOT RECORDED — letter ${letter.id} for ${letter.child_name} ` +
          `went to Stannp as ${result.id} but the DB update failed: ${updateError.message}. ` +
          `Mark it sent manually or it will be mailed again.`
        )
        failed++
        return
      }

      console.log(`✅ Sent letter for ${letter.child_name}, Stannp ID: ${result.id}`)
      sent++
    } catch (err) {
      console.error(`❌ Failed to send letter for ${letter.child_name}:`, err)
      failed++
    }
  }

  // Bounded worker pool. Single-threaded event loop, so the shared cursor and
  // counters need no locking. Workers stop claiming work once the time budget
  // is spent; whatever is left stays sent=false for the next run.
  let cursor = 0
  const workerCount = Math.min(concurrency, batch.length)
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < batch.length) {
        if (Date.now() - startedAt > timeBudgetMs) {
          skipped += batch.length - cursor
          cursor = batch.length
          console.warn(`⏱️  Time budget reached — deferring ${skipped} letters to the next run`)
          return
        }
        await sendOne(batch[cursor++])
      }
    })
  )

  // Count what is still due after this batch. Failures stay sent=false and are
  // counted here too, so a stuck letter shows up as a backlog that never clears.
  const remainingQuery = supabase
    .from('scheduled_letters')
    .select('*', { count: 'exact', head: true })
    .eq('sent', false)
    .lte('send_after', cutoff)

  const { count: remaining, error: countError } = await (testOverride
    ? remainingQuery.like('stripe_session_id', `${TEST_SESSION_PREFIX}%`)
    : remainingQuery)

  if (countError) {
    console.error('Error counting remaining letters:', countError)
  } else if (remaining && remaining > 0) {
    console.log(`↩️  ${remaining} letters still due — the next scheduled run will continue`)
  }

  if (invalidAddress > 0) {
    console.warn(
      `⚠️  ${invalidAddress} letter(s) held back on address validation. These stay in the ` +
      `backlog and will be retried every run until the address is corrected.`
    )
  }

  return NextResponse.json({
    sent,
    failed,
    skipped,
    invalidAddress,
    remindersSent,
    testOverride: testOverride ? cutoff : false,
    processed: batch.length - skipped,
    remaining: remaining ?? 0,
    batchSize,
    concurrency,
    elapsedMs: Date.now() - startedAt,
  })
}
