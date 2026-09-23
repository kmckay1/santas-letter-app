import { NextRequest, NextResponse } from 'next/server'
import { processReferralClaim } from '@/lib/referral-grant'

// Awards the free premium PDF on both sides of a referral.
//
// Called by /preview once the free letter is on screen, rather than from inside
// /api/generate. Two PDF renders inline would add seconds to the letter the user
// is sitting and waiting for. A user who closes the tab before this fires is
// picked up by /api/cron/referral-sweep instead.
//
// Safe to expose. The letter id is the only input, every decision is made from
// stored state, and the grant is claimed with a conditional update, so calling it
// repeatedly or with someone else's id cannot produce extra PDFs.
export async function POST(req: NextRequest) {
  let letterId: string | undefined
  try {
    const body = await req.json()
    letterId = typeof body?.letterId === 'string' ? body.letterId : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!letterId) {
    return NextResponse.json({ error: 'Missing letterId' }, { status: 400 })
  }

  try {
    const result = await processReferralClaim(letterId)
    if (!result) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (err) {
    // The grant is already claimed at this point if delivery threw, which is the
    // conservative side to fail on: a missing free PDF is recoverable by hand, a
    // loop that keeps re-rendering is not. The sweep will not retry it either,
    // for the same reason.
    console.error(`Referral claim failed for letter ${letterId}:`, err)
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
  }
}
