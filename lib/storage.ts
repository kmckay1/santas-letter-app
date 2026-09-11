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

export async function storeLetter(letter: StoredLetter): Promise<string | null> {
  const { url, key } = getSupabaseAdmin()
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
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase insert failed: ${err}`)
  }
  const rows = await res.json()
  const row = Array.isArray(rows) ? rows[0] : rows
  return row?.upgrade_token || null
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

export function generateLetterId(childName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const slug = childName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)
  return `${slug}-${timestamp}-${random}`
}