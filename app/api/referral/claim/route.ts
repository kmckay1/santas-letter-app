import { NextRequest, NextResponse } from 'next/server'
import {
  getLetter,
  getLetterByReferralCode,
  countReferralGrants,
  claimReferralGrant,
  markLetterFulfilled,
  mergeTier,
  tierGrants,
  REFERRAL_GRANT_CAP,
  StoredLetter,
} from '@/lib/storage'
import { deliverPremiumPdf } from '@/lib/fulfillment'

// Awards the free premium PDF on both sides of a referral.
//
// Called by /preview once the free letter is on screen, rather than from inside
// /api/generate. Two PDF renders inline would add seconds to the letter the user
// is sitting and waiting for. The cost of that choice is that closing the tab
// immediately loses the grant; every guard below is idempotent, so a later sweep
// could backfill if that turns out to matter.
//
// Safe to expose. The letter id is the only input, every decision is made from
// stored state, and the grant is claimed with a conditional update, so calling
// it repeatedly or with someone else's id cannot produce extra PDFs.

type Outcome =
  | 'granted'
  | 'not_referred'
  | 'already_granted'
  | 'unknown_code'
  | 'self_referral'
  | 'cap_reached'

function ownsPremium(letter: StoredLetter): boolean {
  return !!letter.fulfilled && tierGrants(letter.tier).premium
}

// Delivers to one side and records the entitlement. Returns false when there was
// nothing to do: no address to send to, or premium already owned, in which case
// the same PDF would simply be sent twice.
async function grantPremium(letter: StoredLetter): Promise<boolean> {
  if (!letter.email) return false
  if (ownsPremium(letter)) return false

  await deliverPremiumPdf(letter, letter.email)
  // Merge rather than overwrite, exactly as a paid purchase does: a letter that
  // already had the posted mail becomes a bundle, not a downgrade to premium.
  await markLetterFulfilled(letter.id, mergeTier(letter.tier, 'premium'))
  return true
}

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

  const reply = (outcome: Outcome, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ outcome, ...extra })

  try {
    const referee = await getLetter(letterId)
    if (!referee) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    const code = referee.referredByCode
    if (!code) return reply('not_referred')

    // Already settled. Returned before any lookup so repeat calls are cheap.
    if (referee.referralPremiumGrantedAt) return reply('already_granted')

    const referrer = await getLetterByReferralCode(code)
    if (!referrer) {
      console.log(`Referral code ${code} on letter ${letterId} matches no letter`)
      return reply('unknown_code')
    }

    // Self-referral. The id check catches someone pasting their own link back
    // into their own flow; the email check catches the more common version,
    // which is a parent using their own link for a second child.
    const sameLetter = referrer.id === referee.id
    const sameEmail =
      !!referrer.email &&
      !!referee.email &&
      referrer.email.toLowerCase().trim() === referee.email.toLowerCase().trim()
    if (sameLetter || sameEmail) {
      console.log(`Self-referral rejected for letter ${letterId} on code ${code}`)
      return reply('self_referral')
    }

    const used = await countReferralGrants(code)
    if (used >= REFERRAL_GRANT_CAP) {
      console.log(`Referral code ${code} is at its cap of ${REFERRAL_GRANT_CAP}`)
      return reply('cap_reached', { cap: REFERRAL_GRANT_CAP })
    }

    // Claim before delivering. Whichever concurrent call wins the conditional
    // update does the work; the rest see the grant already taken.
    const claimed = await claimReferralGrant(referee.id)
    if (!claimed) return reply('already_granted')

    // Re-read so the merge uses the row as it stands after the claim.
    const refereeNow = (await getLetter(referee.id)) ?? referee
    const refereeGranted = await grantPremium(refereeNow)

    // The referrer's side is stamped too, which is both their record and their
    // idempotency: a second successful referral will not resend a PDF they
    // already have. It does not affect the cap, which counts referee rows.
    let referrerGranted = false
    if (!referrer.referralPremiumGrantedAt && (await claimReferralGrant(referrer.id))) {
      referrerGranted = await grantPremium(referrer)
    }

    console.log(
      `Referral grant on code ${code}: referee ${referee.id} ${refereeGranted ? 'sent' : 'skipped'}, ` +
      `referrer ${referrer.id} ${referrerGranted ? 'sent' : 'skipped'} (${used + 1}/${REFERRAL_GRANT_CAP})`
    )

    return reply('granted', { refereeGranted, referrerGranted })
  } catch (err) {
    // The grant is already claimed at this point if delivery threw, which is the
    // conservative side to fail on: a missing free PDF is recoverable by hand, a
    // loop that keeps re-rendering is not.
    console.error(`Referral claim failed for letter ${letterId}:`, err)
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
  }
}
