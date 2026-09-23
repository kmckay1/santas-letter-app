import { NextRequest, NextResponse } from 'next/server'
import { listPendingReferralGrants } from '@/lib/storage'
import { processReferralClaim, ReferralOutcome } from '@/lib/referral-grant'

// Hourly backstop for the referral grant.
//
// /api/referral/claim fires from /preview once the free letter renders, which
// misses anyone who closes the tab in the first second or two. Their row sits
// with referred_by_code set and referral_premium_granted_at null, which is
// exactly this sweep's queue.
//
// It runs the same processReferralClaim the live trigger does, so there is one
// implementation of the decision and no second copy to drift. Double-processing
// is safe by construction rather than by timing: the claim is a conditional
// update on referral_premium_granted_at being null, so if the trigger and the
// sweep reach one letter together, exactly one wins and the other delivers
// nothing.
//
// Rows that resolve to a terminal non-grant (self-referral, unknown code, over
// the cap) keep a null stamp and so are re-examined every hour. That is cheap:
// those paths are reads only, they short-circuit before any render, and leaving
// them queued means a code that was over its cap can still grant later if an
// earlier grant is ever reversed by hand.

// Each grant can render two PDFs and send two emails, roughly ten seconds for
// the pair. vercel.json allows this function 300s, so a batch of 15 finishes
// with room to spare. Anything not reached stays queued for the next run.
const DEFAULT_BATCH_SIZE = 15

// Stop starting new letters once this much of the run has elapsed, so a slow
// batch rolls over cleanly instead of being killed mid-delivery.
const DEFAULT_TIME_BUDGET_MS = 240_000

function positiveIntEnv(name: string, fallback: number): number {
  const configured = Number(process.env[name])
  return Number.isInteger(configured) && configured > 0 ? configured : fallback
}

export async function GET(req: NextRequest) {
  // Auth — must match Vercel cron's Authorization: Bearer <CRON_SECRET> header
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const batchSize = positiveIntEnv('REFERRAL_SWEEP_BATCH_SIZE', DEFAULT_BATCH_SIZE)
  const timeBudgetMs = positiveIntEnv('REFERRAL_SWEEP_TIME_BUDGET_MS', DEFAULT_TIME_BUDGET_MS)

  // Reports what the sweep would find without claiming or delivering anything.
  // Needs no env gate because it performs no writes, which makes it safe to run
  // against the shared production database from a local checkout.
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true'

  try {
    const pending = await listPendingReferralGrants(batchSize)

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        batchSize,
        pending: pending.length,
        letterIds: pending,
      })
    }

    const outcomes: Record<string, number> = {}
    let processed = 0
    let refereePdfs = 0
    let referrerPdfs = 0
    let timedOut = false

    for (const letterId of pending) {
      if (Date.now() - startedAt > timeBudgetMs) {
        timedOut = true
        console.warn(`⏱️  Referral sweep hit its time budget after ${processed} letters`)
        break
      }

      try {
        const result = await processReferralClaim(letterId)
        const outcome: ReferralOutcome | 'not_found' = result?.outcome ?? 'not_found'
        outcomes[outcome] = (outcomes[outcome] || 0) + 1
        if (result?.refereeGranted) refereePdfs++
        if (result?.referrerGranted) referrerPdfs++
        processed++
      } catch (err) {
        // One bad letter must not abandon the rest of the batch. The grant is
        // already claimed if delivery threw, so this row will not be retried,
        // which is the conservative side to fail on.
        outcomes.error = (outcomes.error || 0) + 1
        console.error(`Referral sweep failed on letter ${letterId}:`, err)
      }
    }

    const summary = {
      found: pending.length,
      processed,
      refereePdfs,
      referrerPdfs,
      outcomes,
      timedOut,
      elapsedMs: Date.now() - startedAt,
    }
    console.log('Referral sweep complete:', JSON.stringify(summary))
    return NextResponse.json(summary)
  } catch (err) {
    console.error('Referral sweep failed:', err)
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 })
  }
}
