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

// The referral grant decision, shared by the two things that run it: the
// /api/referral/claim call fired from /preview once the letter is on screen, and
// the hourly sweep that picks up the ones that call never reached.
//
// Every step is idempotent, so the two racing on the same letter is safe rather
// than merely unlikely. The claim itself is a conditional update whose is.null
// predicate lets exactly one caller through; the loser sees zero rows and
// delivers nothing.

export type ReferralOutcome =
  | 'granted'
  | 'not_referred'
  | 'already_granted'
  | 'unknown_code'
  | 'self_referral'
  | 'cap_reached'

export interface ReferralResult {
  outcome: ReferralOutcome
  refereeGranted: boolean
  referrerGranted: boolean
  code?: string
}

function ownsPremium(letter: StoredLetter): boolean {
  return !!letter.fulfilled && tierGrants(letter.tier).premium
}

// Delivers to one side and records the entitlement. False means there was
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

const NOTHING = { refereeGranted: false, referrerGranted: false }

export async function processReferralClaim(letterId: string): Promise<ReferralResult | null> {
  const referee = await getLetter(letterId)
  if (!referee) return null

  const code = referee.referredByCode
  if (!code) return { outcome: 'not_referred', ...NOTHING }

  // Already settled. Checked before any further lookup so repeat calls are cheap.
  if (referee.referralPremiumGrantedAt) return { outcome: 'already_granted', ...NOTHING, code }

  const referrer = await getLetterByReferralCode(code)
  if (!referrer) {
    console.log(`Referral code ${code} on letter ${letterId} matches no letter`)
    return { outcome: 'unknown_code', ...NOTHING, code }
  }

  // Self-referral. The id check catches someone pasting their own link back into
  // their own flow; the email check catches the more common version, which is a
  // parent using their own link for a second child.
  const sameLetter = referrer.id === referee.id
  const sameEmail =
    !!referrer.email &&
    !!referee.email &&
    referrer.email.toLowerCase().trim() === referee.email.toLowerCase().trim()
  if (sameLetter || sameEmail) {
    console.log(`Self-referral rejected for letter ${letterId} on code ${code}`)
    return { outcome: 'self_referral', ...NOTHING, code }
  }

  const used = await countReferralGrants(code)
  if (used >= REFERRAL_GRANT_CAP) {
    console.log(`Referral code ${code} is at its cap of ${REFERRAL_GRANT_CAP}`)
    return { outcome: 'cap_reached', ...NOTHING, code }
  }

  // Claim before delivering. Whichever caller wins the conditional update does
  // the work; the rest see the grant already taken.
  const claimed = await claimReferralGrant(referee.id)
  if (!claimed) return { outcome: 'already_granted', ...NOTHING, code }

  // Re-read so the merge uses the row as it stands after the claim.
  const refereeNow = (await getLetter(referee.id)) ?? referee
  const refereeGranted = await grantPremium(refereeNow)

  // The referrer's side is stamped too, which is both their record and their
  // idempotency: a second successful referral will not resend a PDF they already
  // have. It does not affect the cap, which counts referee rows.
  let referrerGranted = false
  if (!referrer.referralPremiumGrantedAt && (await claimReferralGrant(referrer.id))) {
    referrerGranted = await grantPremium(referrer)
  }

  console.log(
    `Referral grant on code ${code}: referee ${referee.id} ${refereeGranted ? 'sent' : 'skipped'}, ` +
    `referrer ${referrer.id} ${referrerGranted ? 'sent' : 'skipped'} (${used + 1}/${REFERRAL_GRANT_CAP})`
  )

  return { outcome: 'granted', refereeGranted, referrerGranted, code }
}
