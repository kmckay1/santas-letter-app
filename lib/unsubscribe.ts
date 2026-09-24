import { createHmac } from 'crypto'

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET env var not set')
  return secret
}

function getSupabaseCreds() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return { url, key }
}

/**
 * Generate an HMAC-SHA256 token for an email address.
 * Same email + same secret always produces same token, so links are stable.
 */
export function generateUnsubscribeToken(email: string): string {
  return createHmac('sha256', getSecret())
    .update(email.toLowerCase().trim())
    .digest('hex')
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false
  const expected = generateUnsubscribeToken(email)
  if (expected.length !== token.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Generate the full unsubscribe URL to include in email footers.
 */
export function generateUnsubscribeUrl(email: string): string {
  const lowered = email.toLowerCase().trim()
  const token = generateUnsubscribeToken(lowered)
  const params = new URLSearchParams({ email: lowered, token })
  return `https://santasletter.ai/unsubscribe?${params.toString()}`
}

/**
 * URL for RFC 8058 one-click unsubscribe. Mailbox providers POST to it with
 * the body `List-Unsubscribe=One-Click` and no further user interaction, so it
 * points at an API route rather than the confirmation page.
 */
export function generateOneClickUnsubscribeUrl(email: string): string {
  const lowered = email.toLowerCase().trim()
  const token = generateUnsubscribeToken(lowered)
  const params = new URLSearchParams({ email: lowered, token })
  return `https://santasletter.ai/api/unsubscribe-one-click?${params.toString()}`
}

/**
 * Headers that enable one-click unsubscribe in Gmail, Yahoo and other
 * providers (RFC 8058). Pass as `headers` to resend.emails.send().
 */
export function unsubscribeHeaders(email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${generateOneClickUnsubscribeUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

/**
 * Check whether an email is currently unsubscribed.
 * Returns true if either subscribers or letters tables show unsubscribed=true.
 *
 * Fails closed: a failed query throws rather than returning false, because
 * "could not check" must never be read as "still subscribed" and mailed.
 */
export async function isUnsubscribed(email: string): Promise<boolean> {
  const lowered = email.toLowerCase().trim()
  const { url, key } = getSupabaseCreds()
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
  }

  // Check subscribers
  const subRes = await fetch(
    `${url}/rest/v1/subscribers?email=eq.${encodeURIComponent(lowered)}&unsubscribed=eq.true&select=id&limit=1`,
    { cache: 'no-store', headers }
  )
  if (!subRes.ok) {
    throw new Error(`isUnsubscribed: subscribers query failed (HTTP ${subRes.status})`)
  }
  const subRows = await subRes.json()
  if (subRows.length > 0) return true

  // Check letters
  const letterRes = await fetch(
    `${url}/rest/v1/letters?email=eq.${encodeURIComponent(lowered)}&unsubscribed=eq.true&select=id&limit=1`,
    { cache: 'no-store', headers }
  )
  if (!letterRes.ok) {
    throw new Error(`isUnsubscribed: letters query failed (HTTP ${letterRes.status})`)
  }
  const letterRows = await letterRes.json()
  return letterRows.length > 0
}

/**
 * Mark an email as unsubscribed in both subscribers and letters tables.
 *
 * Both PATCHes are attempted even if the first fails, so one table still gets
 * the flag, then this throws if either failed. The caller must not report
 * success on a throw.
 */
export async function markUnsubscribed(email: string): Promise<void> {
  const lowered = email.toLowerCase().trim()
  const { url, key } = getSupabaseCreds()
  const headers = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'return=minimal',
  }
  const now = new Date().toISOString()

  const subRes = await fetch(`${url}/rest/v1/subscribers?email=eq.${encodeURIComponent(lowered)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers,
    body: JSON.stringify({ unsubscribed: true, unsubscribed_at: now }),
  })

  const letterRes = await fetch(`${url}/rest/v1/letters?email=eq.${encodeURIComponent(lowered)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers,
    body: JSON.stringify({ unsubscribed: true }),
  })

  const failures: string[] = []
  if (!subRes.ok) {
    failures.push(`subscribers PATCH HTTP ${subRes.status}: ${(await subRes.text().catch(() => '')).slice(0, 200)}`)
  }
  if (!letterRes.ok) {
    failures.push(`letters PATCH HTTP ${letterRes.status}: ${(await letterRes.text().catch(() => '')).slice(0, 200)}`)
  }
  if (failures.length > 0) {
    throw new Error(`markUnsubscribed failed: ${failures.join('; ')}`)
  }
}

/**
 * Reverse an unsubscribe (user clicked "resubscribe").
 */
export async function markResubscribed(email: string): Promise<void> {
  const lowered = email.toLowerCase().trim()
  const { url, key } = getSupabaseCreds()
  const headers = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'return=minimal',
  }

  await fetch(`${url}/rest/v1/subscribers?email=eq.${encodeURIComponent(lowered)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers,
    body: JSON.stringify({ unsubscribed: false, unsubscribed_at: null }),
  })

  await fetch(`${url}/rest/v1/letters?email=eq.${encodeURIComponent(lowered)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers,
    body: JSON.stringify({ unsubscribed: false }),
  })
}
