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
 * Check whether an email is currently unsubscribed.
 * Returns true if either subscribers or letters tables show unsubscribed=true.
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
  if (subRes.ok) {
    const rows = await subRes.json()
    if (rows.length > 0) return true
  }

  // Check letters
  const letterRes = await fetch(
    `${url}/rest/v1/letters?email=eq.${encodeURIComponent(lowered)}&unsubscribed=eq.true&select=id&limit=1`,
    { cache: 'no-store', headers }
  )
  if (letterRes.ok) {
    const rows = await letterRes.json()
    if (rows.length > 0) return true
  }

  return false
}

/**
 * Mark an email as unsubscribed in both subscribers and letters tables.
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

  await fetch(`${url}/rest/v1/subscribers?email=eq.${encodeURIComponent(lowered)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers,
    body: JSON.stringify({ unsubscribed: true, unsubscribed_at: now }),
  })

  await fetch(`${url}/rest/v1/letters?email=eq.${encodeURIComponent(lowered)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers,
    body: JSON.stringify({ unsubscribed: true }),
  })
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