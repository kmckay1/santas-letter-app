import { randomBytes } from 'crypto'
import { ChildInfo } from '@/types'

export interface StoredLetter {
  id: string
  child: ChildInfo
  letterText: string
  language: string
  createdAt: string
  tier?: string
  fulfilled?: boolean
  upgradeToken?: string
  email?: string
  premiumPdfSentAt?: string | null
  referralCode?: string | null
  referredByCode?: string | null
  referralPremiumGrantedAt?: string | null
  marketingConsent?: boolean
  // Set on the owner's own test rows (kylemckay22 addresses). Test letters are
  // excluded from marketing, the referral sweep and referral grants.
  isTest?: boolean
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role env vars not set')
  return { url, key }
}

// Every Supabase call goes through the service-role key. RLS is enabled on
// `letters` with no policies — deliberately, because the table holds children's
// personal data and must never be readable from a browser — so anon-key reads
// return an empty result for rows that plainly exist. Reads therefore use the
// same elevated key as writes, and this module must only ever be imported by
// server code (route handlers and server components).
async function supabaseAdminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { url, key } = getSupabaseAdmin()
  return fetch(`${url}/rest/v1${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
      ...options.headers,
    },
  })
}

/**
 * PostgREST answers a permission or transport failure with a non-2xx status, which
 * is a completely different thing from "no such row". Conflating the two is what
 * let a broken anon key look like a missing letter for 91 days, so transport
 * failures throw and only an empty result set returns null.
 */
async function assertOk(res: Response, context: string): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '<unreadable>')
  throw new Error(`${context} failed: HTTP ${res.status} ${res.statusText} — ${body.slice(0, 300)}`)
}

// Omits 0/O and 1/I so a code survives being read aloud or retyped from a
// screenshot. 32^6 is about 1.07 billion, so a collision is already unlikely at
// this scale; the unique index is what actually guarantees it, and storeLetter
// retries on the rejection rather than trusting the odds.
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const REFERRAL_CODE_LENGTH = 6

export function generateReferralCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length]
  }
  return code
}

export interface StoredLetterResult {
  upgradeToken: string | null
  referralCode: string | null
}

export async function storeLetter(letter: StoredLetter): Promise<StoredLetterResult> {
  const { url, key } = getSupabaseAdmin()

  // The referral code is generated here rather than by the caller so every letter
  // gets one by construction. A draw can in principle collide with an existing
  // code, which the unique index rejects with a 409; retry with a fresh draw a
  // few times before giving up.
  const MAX_CODE_ATTEMPTS = 5
  let lastError = ''

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const referralCode = generateReferralCode()

    // Use return=representation so we can read back the auto-generated upgrade_token
    const res = await fetch(
      `${url}/rest/v1/letters`,
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          id: letter.id,
          child_name: letter.child.name,
          child_age: letter.child.age,
          child_data: letter.child,
          letter_text: letter.letterText,
          language: letter.language,
          created_at: letter.createdAt,
          fulfilled: false,
          // Store email so Phase 2 nurture sequence can find recipients later.
          // Stored lowercase so the unsubscribe lookup (which lowercases) matches.
          email: letter.email ? letter.email.toLowerCase().trim() : null,
          referral_code: referralCode,
          // Recorded for every referred signup, including ones that will not earn a
          // grant, so the attribution ratio counts what actually happened. Stored
          // uppercase because codes are compared case-insensitively.
          referred_by_code: letter.referredByCode
            ? letter.referredByCode.toUpperCase().trim()
            : null,
          // Opt-in to marketing email from the /create checkbox. Stored as a
          // strict boolean so a missing value is never read as consent.
          marketing_consent: letter.marketingConsent === true,
        }),
      }
    )

    if (res.ok) {
      const rows = await res.json()
      const row = Array.isArray(rows) ? rows[0] : rows
      return {
        upgradeToken: row?.upgrade_token || null,
        referralCode: row?.referral_code || referralCode,
      }
    }

    lastError = await res.text()

    // 409 from the referral code index means this draw was taken. Any other 409
    // is a different constraint (a duplicate letter id, say) and retrying the
    // same insert would only fail the same way.
    const isCodeCollision = res.status === 409 && lastError.includes('letters_referral_code_key')
    if (!isCodeCollision) break
  }

  throw new Error(`Supabase insert failed: ${lastError}`)
}

export async function getLetter(id: string): Promise<StoredLetter | null> {
  const res = await supabaseAdminFetch(`/letters?id=eq.${id}&limit=1`, {
    method: 'GET',
    headers: { 'Prefer': 'return=representation' },
  })
  await assertOk(res, `getLetter(${id})`)
  const rows = await res.json()
  if (!rows || rows.length === 0) return null
  const row = rows[0]
  return {
    id: row.id,
    child: row.child_data,
    letterText: row.letter_text,
    language: row.language,
    createdAt: row.created_at,
    tier: row.tier,
    fulfilled: row.fulfilled,
    upgradeToken: row.upgrade_token,
    email: row.email,
    premiumPdfSentAt: row.premium_pdf_sent_at ?? null,
    referralCode: row.referral_code ?? null,
    referredByCode: row.referred_by_code ?? null,
    referralPremiumGrantedAt: row.referral_premium_granted_at ?? null,
    isTest: row.is_test === true,
  }
}

export async function getLetterByUpgradeToken(token: string): Promise<StoredLetter | null> {
  // Validate UUID format before querying (prevents injection, fails fast on bad input)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) return null

  const res = await supabaseAdminFetch(`/letters?upgrade_token=eq.${token}&limit=1`, {
    method: 'GET',
    headers: { 'Prefer': 'return=representation' },
  })
  await assertOk(res, 'getLetterByUpgradeToken')
  const rows = await res.json()
  if (!rows || rows.length === 0) return null
  const row = rows[0]
  return {
    id: row.id,
    child: row.child_data,
    letterText: row.letter_text,
    language: row.language,
    createdAt: row.created_at,
    tier: row.tier,
    fulfilled: row.fulfilled,
    upgradeToken: row.upgrade_token,
    email: row.email,
    premiumPdfSentAt: row.premium_pdf_sent_at ?? null,
    referralCode: row.referral_code ?? null,
    referredByCode: row.referred_by_code ?? null,
    referralPremiumGrantedAt: row.referral_premium_granted_at ?? null,
    isTest: row.is_test === true,
  }
}

/**
 * Stamped as soon as the premium PDF email is accepted, so a retry of the webhook
 * can tell "already delivered" from "not yet attempted" without re-emailing.
 */
export async function markPremiumPdfSent(id: string): Promise<void> {
  const res = await supabaseAdminFetch(`/letters?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ premium_pdf_sent_at: new Date().toISOString() }),
  })
  await assertOk(res, `markPremiumPdfSent(${id})`)
}

export async function markLetterFulfilled(id: string, tier: string): Promise<void> {
  const res = await supabaseAdminFetch(`/letters?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fulfilled: true, tier }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase update failed: ${err}`)
  }
}

// --- Tier entitlements ------------------------------------------------------
// A letter accumulates entitlements across purchases. Buying premium and later
// buying physical leaves the customer owning both, which is what `bundle`
// encodes, so a second purchase must merge rather than overwrite. Overwriting
// would strip the earlier entitlement and make the upgrade page offer something
// already paid for.

export function tierGrants(tier?: string | null): { premium: boolean; physical: boolean } {
  return {
    premium: tier === 'premium' || tier === 'bundle',
    physical: tier === 'physical' || tier === 'bundle',
  }
}

export function mergeTier(existing: string | null | undefined, incoming: string): string {
  const a = tierGrants(existing)
  const b = tierGrants(incoming)
  const premium = a.premium || b.premium
  const physical = a.physical || b.physical
  if (premium && physical) return 'bundle'
  if (premium) return 'premium'
  if (physical) return 'physical'
  // Neither grants a letter entitlement (addChild, or an unknown tier). Record
  // the latest rather than inventing one.
  return incoming
}

// --- Webhook session bookkeeping --------------------------------------------

export interface WebhookSession {
  stripeSessionId: string
  letterId: string
  tier: string
  premiumPdfSentAt: string | null
  completedAt: string | null
}

function rowToWebhookSession(row: Record<string, unknown>): WebhookSession {
  return {
    stripeSessionId: row.stripe_session_id as string,
    letterId: row.letter_id as string,
    tier: row.tier as string,
    premiumPdfSentAt: (row.premium_pdf_sent_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
  }
}

// How long one delivery holds a session. Must exceed the webhook's maxDuration in
// vercel.json (60s): Vercel kills the function by then, so a live request can
// never lose its lease to a second delivery, and a crashed one frees the session
// shortly after.
export const WEBHOOK_LEASE_SECONDS = 90

export type WebhookClaim =
  // This delivery holds the lease. resumed is true when an earlier attempt
  // started the session and did not finish; each step is separately guarded.
  | { outcome: 'claimed'; resumed: boolean; session: WebhookSession }
  // Already fully handled: the delivery is a replay.
  | { outcome: 'completed'; session: WebhookSession }
  // Another delivery holds a live lease. The caller must not do any work.
  | { outcome: 'in_progress' }

// Claims a Stripe session for processing, exclusively. The claim is one atomic
// statement (supabase/webhook_sessions_claim.sql): it creates the row, or takes
// the lease on an unfinished and unleased one, and otherwise changes nothing.
// Replaces a read-then-insert that let two simultaneous deliveries both run.
export async function claimWebhookSession(
  stripeSessionId: string,
  letterId: string,
  tier: string
): Promise<WebhookClaim> {
  const res = await supabaseAdminFetch('/rpc/claim_webhook_session', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      p_session_id: stripeSessionId,
      p_letter_id: letterId,
      p_tier: tier,
      p_lease_seconds: WEBHOOK_LEASE_SECONDS,
    }),
  })
  if (!res.ok) {
    throw new Error(`claim_webhook_session failed: ${await res.text()}`)
  }
  const row = (await res.json()) as Record<string, unknown> | null

  // Null means a concurrent delivery created the row after this statement began,
  // so it is still working on it.
  if (!row) return { outcome: 'in_progress' }

  switch (row.outcome) {
    case 'claimed_new':
      return { outcome: 'claimed', resumed: false, session: rowToWebhookSession(row) }
    case 'claimed_resume':
      return { outcome: 'claimed', resumed: true, session: rowToWebhookSession(row) }
    case 'completed':
      return { outcome: 'completed', session: rowToWebhookSession(row) }
    case 'in_progress':
      return { outcome: 'in_progress' }
    default:
      throw new Error(`claim_webhook_session returned unexpected outcome: ${String(row.outcome)}`)
  }
}

// Gives up the lease early after a failed attempt so Stripe's retry can resume
// at once rather than waiting for expiry. Best effort: expiry frees it anyway.
export async function releaseWebhookSession(stripeSessionId: string): Promise<void> {
  try {
    const res = await supabaseAdminFetch(
      `/webhook_sessions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}&completed_at=is.null`,
      { method: 'PATCH', body: JSON.stringify({ processing_until: null }) }
    )
    if (!res.ok) console.warn(`webhook_sessions release failed: ${await res.text()}`)
  } catch (err) {
    console.warn('webhook_sessions release failed:', err)
  }
}

export async function markSessionPremiumPdfSent(stripeSessionId: string): Promise<void> {
  const res = await supabaseAdminFetch(
    `/webhook_sessions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`,
    { method: 'PATCH', body: JSON.stringify({ premium_pdf_sent_at: new Date().toISOString() }) }
  )
  if (!res.ok) throw new Error(`webhook_sessions premium stamp failed: ${await res.text()}`)
}

export async function markSessionCompleted(stripeSessionId: string): Promise<void> {
  const res = await supabaseAdminFetch(
    `/webhook_sessions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`,
    { method: 'PATCH', body: JSON.stringify({ completed_at: new Date().toISOString(), processing_until: null }) }
  )
  if (!res.ok) throw new Error(`webhook_sessions completion stamp failed: ${await res.text()}`)
}

// --- Referral grants --------------------------------------------------------

// How many free premium grants a single referral code can earn. Each grant costs
// a PDF render and an email, so this bounds what one code can spend. Referrals
// past the cap are still recorded on the letter, they just do not grant, which
// keeps the signup ratio honest while capping the cost.
export const REFERRAL_GRANT_CAP = 5

export async function getLetterByReferralCode(code: string): Promise<StoredLetter | null> {
  const res = await supabaseAdminFetch(
    `/letters?referral_code=eq.${encodeURIComponent(code)}&limit=1`,
    { method: 'GET', headers: { 'Prefer': 'return=representation' } }
  )
  await assertOk(res, `getLetterByReferralCode(${code})`)
  const rows = await res.json()
  if (!rows || rows.length === 0) return null
  const row = rows[0]
  return {
    id: row.id,
    child: row.child_data,
    letterText: row.letter_text,
    language: row.language,
    createdAt: row.created_at,
    tier: row.tier,
    fulfilled: row.fulfilled,
    upgradeToken: row.upgrade_token,
    email: row.email,
    premiumPdfSentAt: row.premium_pdf_sent_at ?? null,
    referralCode: row.referral_code ?? null,
    referredByCode: row.referred_by_code ?? null,
    referralPremiumGrantedAt: row.referral_premium_granted_at ?? null,
    isTest: row.is_test === true,
  }
}

// Grants already earned by a code. Counts referee rows only, because a grant is
// always stamped on the letter that received it.
export async function countReferralGrants(code: string): Promise<number> {
  const res = await supabaseAdminFetch(
    `/letters?referred_by_code=eq.${encodeURIComponent(code)}` +
      `&referral_premium_granted_at=not.is.null&select=id`,
    { method: 'GET', headers: { 'Prefer': 'count=exact' } }
  )
  await assertOk(res, `countReferralGrants(${code})`)
  const rows = await res.json()
  return Array.isArray(rows) ? rows.length : 0
}

// Letters that were referred but have not been through the grant path yet. This
// is the sweep's work queue: the /preview trigger misses anyone who closes the
// tab before it fires, and those rows sit here until the cron picks them up.
//
// Ordered oldest first so a backlog drains in arrival order rather than
// starving the earliest ones.
export async function listPendingReferralGrants(limit: number): Promise<string[]> {
  const res = await supabaseAdminFetch(
    `/letters?referred_by_code=not.is.null&referral_premium_granted_at=is.null` +
      `&is_test=eq.false&select=id&order=created_at.asc&limit=${limit}`,
    { method: 'GET', headers: { 'Prefer': 'return=representation' } }
  )
  await assertOk(res, 'listPendingReferralGrants')
  const rows = await res.json()
  return Array.isArray(rows) ? rows.map((r: { id: string }) => r.id) : []
}

// Claims the grant for one letter. The `is.null` predicate makes this atomic:
// whichever concurrent call updates the row first gets the rows back, and every
// other call matches nothing. Returns false when the grant was already claimed,
// which is the signal to deliver nothing.
export async function claimReferralGrant(letterId: string): Promise<boolean> {
  const res = await supabaseAdminFetch(
    `/letters?id=eq.${encodeURIComponent(letterId)}&referral_premium_granted_at=is.null`,
    {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ referral_premium_granted_at: new Date().toISOString() }),
    }
  )
  await assertOk(res, `claimReferralGrant(${letterId})`)
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0
}

export function generateLetterId(childName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const slug = childName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)
  return `${slug}-${timestamp}-${random}`
}