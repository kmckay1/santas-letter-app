// Client-side handling of ?ref= on the landing page.
//
// localStorage rather than sessionStorage, which is what the child-info and email
// handoff uses. A referral link arrives at the front door and is often acted on
// later, sometimes days later; sessionStorage dies with the tab and would drop the
// attribution, which is the referrer's reward. The 30-day window keeps a stale
// code from being credited to an unrelated visit months afterwards.

const STORAGE_KEY = 'santaRef'
const TTL_MS = 30 * 24 * 60 * 60 * 1000

interface StoredReferral {
  code: string
  expiresAt: number
}

// Codes are drawn from an unambiguous uppercase alphabet, so anything outside it
// is not a code this system issued. Rejecting here keeps junk out of the column
// that the signup ratio is computed from.
const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const code = raw.trim().toUpperCase()
  return CODE_PATTERN.test(code) ? code : null
}

// Reads ?ref= and stores it. First code wins: if a visitor already carries an
// unexpired referral, a later link does not overwrite it, so the person who
// actually introduced them keeps the credit.
export function captureReferralFromUrl(search: string): void {
  if (typeof window === 'undefined') return
  const code = normalizeReferralCode(new URLSearchParams(search).get('ref'))
  if (!code) return
  if (readStoredReferral()) return

  try {
    const payload: StoredReferral = { code, expiresAt: Date.now() + TTL_MS }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Private browsing and full quotas both throw. A lost referral must never
    // interfere with the visit itself.
  }
}

export function readStoredReferral(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredReferral>
    if (typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return normalizeReferralCode(parsed.code)
  } catch {
    return null
  }
}

export function referralLinkFor(code: string): string {
  return `https://www.santasletter.ai/?ref=${code}`
}
