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

// Claims a Stripe session for processing. Returns the row as it stood before this
// call when the session has been seen before, or null when this call created it.
//
// A returned row with completedAt set means the handler already ran to completion
// and the delivery is a replay. A returned row with completedAt null means an
// earlier attempt started and did not finish; the caller should continue, because
// each step is separately guarded.
export async function claimWebhookSession(
  stripeSessionId: string,
  letterId: string,
  tier: string
): Promise<WebhookSession | null> {
  const existing = await supabaseAdminFetch(
    `/webhook_sessions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}&select=*`
  )
  if (!existing.ok) {
    throw new Error(`webhook_sessions lookup failed: ${await existing.text()}`)
  }
  const found = await existing.json()
  if (Array.isArray(found) && found.length > 0) return rowToWebhookSession(found[0])

  const insert = await supabaseAdminFetch('/webhook_sessions', {
    method: 'POST',
    body: JSON.stringify({ stripe_session_id: stripeSessionId, letter_id: letterId, tier }),
  })
  if (insert.ok) return null

  // 409 is the primary key rejecting a concurrent delivery of the same session.
  // Re-read so the caller sees whatever that winner recorded.
  if (insert.status === 409) {
    const retry = await supabaseAdminFetch(
      `/webhook_sessions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}&select=*`
    )
    if (retry.ok) {
      const rows = await retry.json()
      if (Array.isArray(rows) && rows.length > 0) return rowToWebhookSession(rows[0])
    }
  }
  throw new Error(`webhook_sessions insert failed: ${await insert.text()}`)
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
    { method: 'PATCH', body: JSON.stringify({ completed_at: new Date().toISOString() }) }
  )
  if (!res.ok) throw new Error(`webhook_sessions completion stamp failed: ${await res.text()}`)
}

export function generateLetterId(childName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const slug = childName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)
  return `${slug}-${timestamp}-${random}`
}