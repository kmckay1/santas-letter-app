import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ChildInfo } from '@/types'
import { StoredLetter } from '@/lib/storage'
import { isUnsubscribed } from '@/lib/unsubscribe'
import {
  sendMrsClausEmail,
  sendKeepsakeUpgradeEmail,
  sendPhysicalMailPreviewEmail,
} from '@/lib/phase2-emails'

// Daily cron — fires Phase 2 nurture emails (Day 3, 7, 14 post letter creation).
// Eligibility per email:
//   - email IS NOT NULL (legacy letters with no email are skipped)
//   - fulfilled = false (converted users don't get further nurture)
//   - unsubscribed = false (suppressed at letter row)
//   - This email's sent_at column IS NULL (no double-sends)
//   - For Day 7 / Day 14: previous Phase 2 email must have fired at least N days ago
//     (enforces spacing even for backfilled letters)
//
// Additional safety: isUnsubscribed(email) is called per-row before sending.
// This catches the edge case where someone unsubscribed via the subscribers table
// (lead magnet or video waitlist) without the letters row being updated.

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function rowToLetter(row: Record<string, unknown>): StoredLetter {
  return {
    id: row.id as string,
    child: row.child_data as ChildInfo,
    letterText: row.letter_text as string,
    language: row.language as string,
    createdAt: row.created_at as string,
    tier: row.tier as string | undefined,
    fulfilled: row.fulfilled as boolean | undefined,
    upgradeToken: row.upgrade_token as string | undefined,
    email: row.email as string | undefined,
  }
}

interface DayResult {
  candidates: number
  sent: number
  skipped_unsubscribed: number
  errors: number
  error_details: string[]
}

type SentAtColumn = 'phase2_day3_sent_at' | 'phase2_day7_sent_at' | 'phase2_day14_sent_at'

async function processDay(opts: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  dayLabel: 'day3' | 'day7' | 'day14'
  sentAtColumn: SentAtColumn
  createdAtMaxIso: string
  prerequisiteColumn?: 'phase2_day3_sent_at' | 'phase2_day7_sent_at'
  prerequisiteMaxIso?: string
  sendFn: (letter: StoredLetter) => Promise<void>
}): Promise<DayResult> {
  const result: DayResult = {
    candidates: 0,
    sent: 0,
    skipped_unsubscribed: 0,
    errors: 0,
    error_details: [],
  }

  let query = opts.supabase
    .from('letters')
    .select('*')
    .not('email', 'is', null)
    .eq('fulfilled', false)
    .eq('unsubscribed', false)
    .is(opts.sentAtColumn, null)
    .lte('created_at', opts.createdAtMaxIso)

  // Prerequisite: previous Phase 2 email sent at least N days ago.
  // `lte` excludes NULL values automatically, so we don't need a separate not-null check.
  if (opts.prerequisiteColumn && opts.prerequisiteMaxIso) {
    query = query.lte(opts.prerequisiteColumn, opts.prerequisiteMaxIso)
  }

  const { data: rows, error: queryErr } = await query

  if (queryErr) {
    console.error(`[phase2 ${opts.dayLabel}] query error:`, queryErr)
    result.errors++
    result.error_details.push(`Query failed: ${queryErr.message}`)
    return result
  }

  result.candidates = (rows || []).length

  for (const row of (rows || [])) {
    const letterId = row.id as string
    try {
      const letter = rowToLetter(row)

      // Belt + suspenders unsubscribe check — covers cross-table desync edge case
      if (await isUnsubscribed(letter.email!)) {
        result.skipped_unsubscribed++
        // Mark as sent anyway so we don't re-check every day forever
        await opts.supabase
          .from('letters')
          .update({ [opts.sentAtColumn]: new Date().toISOString() })
          .eq('id', letterId)
        continue
      }

      await opts.sendFn(letter)

      await opts.supabase
        .from('letters')
        .update({ [opts.sentAtColumn]: new Date().toISOString() })
        .eq('id', letterId)

      result.sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[phase2 ${opts.dayLabel}] failed for letter ${letterId}:`, err)
      result.errors++
      result.error_details.push(`${letterId}: ${message}`)
    }
  }

  return result
}

export async function GET(req: NextRequest) {
  // Auth — must match Vercel cron's Authorization: Bearer <CRON_SECRET> header
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()
  const DAY_MS = 24 * 60 * 60 * 1000

  // Creation-age thresholds (letters older than N days are eligible for Day N email)
  const day3CreatedAtMax = new Date(now.getTime() - 3 * DAY_MS).toISOString()
  const day7CreatedAtMax = new Date(now.getTime() - 7 * DAY_MS).toISOString()
  const day14CreatedAtMax = new Date(now.getTime() - 14 * DAY_MS).toISOString()

  // Prerequisite spacing — previous Phase 2 email must have fired at least N days ago.
  // Enforces minimum spacing between emails even if backfilled.
  const day3MinSpacingForDay7 = new Date(now.getTime() - 4 * DAY_MS).toISOString()
  const day7MinSpacingForDay14 = new Date(now.getTime() - 7 * DAY_MS).toISOString()

  const day3 = await processDay({
    supabase,
    dayLabel: 'day3',
    sentAtColumn: 'phase2_day3_sent_at',
    createdAtMaxIso: day3CreatedAtMax,
    sendFn: sendMrsClausEmail,
  })

  const day7 = await processDay({
    supabase,
    dayLabel: 'day7',
    sentAtColumn: 'phase2_day7_sent_at',
    createdAtMaxIso: day7CreatedAtMax,
    prerequisiteColumn: 'phase2_day3_sent_at',
    prerequisiteMaxIso: day3MinSpacingForDay7,
    sendFn: sendKeepsakeUpgradeEmail,
  })

  const day14 = await processDay({
    supabase,
    dayLabel: 'day14',
    sentAtColumn: 'phase2_day14_sent_at',
    createdAtMaxIso: day14CreatedAtMax,
    prerequisiteColumn: 'phase2_day7_sent_at',
    prerequisiteMaxIso: day7MinSpacingForDay14,
    sendFn: sendPhysicalMailPreviewEmail,
  })

  const summary = {
    timestamp: now.toISOString(),
    day3,
    day7,
    day14,
  }

  console.log('[phase2 cron] complete:', JSON.stringify(summary))

  return NextResponse.json(summary)
}