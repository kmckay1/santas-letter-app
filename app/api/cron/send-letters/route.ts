import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPhysicalLetter } from '@/lib/stannp'

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

function positiveIntEnv(name: string, fallback: number): number {
  const configured = Number(process.env[name])
  return Number.isInteger(configured) && configured > 0 ? configured : fallback
}

// Shape of the columns this route consumes. The address and child types are
// taken from sendPhysicalLetter itself so they cannot drift from lib/stannp.
type ScheduledLetter = {
  id: string
  child_name: string
  shipping: Parameters<typeof sendPhysicalLetter>[0]
  child_info: Parameters<typeof sendPhysicalLetter>[1]
  letter_content: string
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

  // Fetch one batch of unsent letters due today or earlier. Oldest send_after
  // first so a backlog drains in the order it was scheduled rather than
  // starving the earliest orders.
  const { data: letters, error } = await supabase
    .from('scheduled_letters')
    .select('*')
    .eq('sent', false)
    .lte('send_after', today)
    .order('send_after', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error('Error fetching scheduled letters:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!letters || letters.length === 0) {
    console.log('No letters due today')
    return NextResponse.json({
      sent: 0, failed: 0, processed: 0, skipped: 0, remaining: 0,
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

  async function sendOne(letter: ScheduledLetter) {
    try {
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
  const { count: remaining, error: countError } = await supabase
    .from('scheduled_letters')
    .select('*', { count: 'exact', head: true })
    .eq('sent', false)
    .lte('send_after', today)

  if (countError) {
    console.error('Error counting remaining letters:', countError)
  } else if (remaining && remaining > 0) {
    console.log(`↩️  ${remaining} letters still due — the next scheduled run will continue`)
  }

  return NextResponse.json({
    sent,
    failed,
    skipped,
    processed: batch.length - skipped,
    remaining: remaining ?? 0,
    batchSize,
    concurrency,
    elapsedMs: Date.now() - startedAt,
  })
}
