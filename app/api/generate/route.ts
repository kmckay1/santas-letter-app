import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { kv } from '@vercel/kv'
import { ChildInfo } from '@/types'
import { storeLetter, generateLetterId } from '@/lib/storage'
import { sendFreeLetterEmail } from '@/lib/resend'
import { generateLetter } from '@/lib/letter-generation'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Returns a message describing the first violation, or null when the input is
// acceptable. Limits match the maxLength attributes on /create.
function validateInput(child: ChildInfo, email: unknown): string | null {
  if (typeof child.name !== 'string') return 'Child name must be text'
  const name = child.name.trim()
  if (name.length < 1 || name.length > 50) return 'Child name must be between 1 and 50 characters'

  const age = Number(child.age)
  if (!Number.isInteger(age) || age < 1 || age > 16) return 'Age must be a whole number between 1 and 16'

  if (child.behaviorNotes != null) {
    if (typeof child.behaviorNotes !== 'string') return 'Behavior notes must be text'
    if (child.behaviorNotes.length > 500) return 'Behavior notes must be 500 characters or fewer'
  }

  if (child.parentNotes != null) {
    if (typeof child.parentNotes !== 'string') return 'Parent notes must be text'
    if (child.parentNotes.length > 300) return 'Parent notes must be 300 characters or fewer'
  }

  if (!Array.isArray(child.wishes)) return 'Wishes must be a list'
  for (const wish of child.wishes) {
    if (typeof wish !== 'string') return 'Each wish must be text'
    if (wish.length > 100) return 'Each wish must be 100 characters or fewer'
  }

  if (typeof email !== 'string' || email.length > 120 || !EMAIL_PATTERN.test(email)) {
    return 'A valid email address of 120 characters or fewer is required'
  }

  return null
}

// Each request here costs an Opus call and sends up to four emails, and the
// route is public, so it is rate limited before any other work.
const EMAIL_LIMIT = 3
const EMAIL_WINDOW_SECONDS = 24 * 60 * 60
const IP_LIMIT = 10
const IP_WINDOW_SECONDS = 60 * 60

function clientIp(req: NextRequest): string {
  // x-forwarded-for can be a list; the first entry is the client.
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip')?.trim() || 'unknown'
}

// Increments the counter for a key, starting its window on the first hit.
// Returns true once the count is past the limit.
async function overLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const count = await kv.incr(key)
  if (count === 1) await kv.expire(key, windowSeconds)
  return count > limit
}

// Fails open: if KV is missing or down, the request goes through. Losing the
// limiter for a while is better than losing letter generation, and the
// server-side validation below still caps what each request can cost.
async function isRateLimited(req: NextRequest, email: unknown): Promise<boolean> {
  try {
    // The email is hashed so parents' addresses are not copied into the KV store.
    if (typeof email === 'string' && email.trim()) {
      const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
      if (await overLimit(`rate:email:${emailHash}:generate`, EMAIL_LIMIT, EMAIL_WINDOW_SECONDS)) {
        return true
      }
    }
    return await overLimit(`rate:ip:${clientIp(req)}:generate`, IP_LIMIT, IP_WINDOW_SECONDS)
  } catch (err) {
    console.warn('Rate limiter unavailable, allowing request:', err)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { child, language = 'en', email, referredByCode, marketingConsent = false } = await req.json() as {
      child: ChildInfo
      language?: string
      email?: string
      referredByCode?: string | null
      marketingConsent?: boolean
    }

    if (await isRateLimited(req, email)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    if (!child?.name || !child?.age) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // The form enforces these limits too, but only in the browser. This route is
    // public and every request pays for an Opus call, so the server holds the line.
    const invalid = validateInput(child, email)
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 })
    }

    // Writes the letter, runs the rating and invention checks, and regenerates
    // at most once. See lib/letter-generation.ts.
    const { letterText } = await generateLetter(child, language)

    const letterId = generateLetterId(child.name)
    const storedLetter = {
      id: letterId,
      child,
      letterText,
      language,
      createdAt: new Date().toISOString(),
      email,
      // Carried from ?ref= on the landing page. Recorded whatever its value: an
      // unknown or capped code still counts as a referred signup.
      referredByCode: typeof referredByCode === 'string' ? referredByCode : null,
      // Only a literal true counts as opting in to marketing email.
      marketingConsent: marketingConsent === true,
    }

    // Persist the letter AND the email together. With email now captured on the
    // form, this write banks the lead the moment generation completes — even if
    // the user closes the tab before reading. Capture is best-effort: a storage
    // failure must never block returning the letter to the user.
    let upgradeToken: string | null = null
    let referralCode: string | null = null
    try {
      const stored = await storeLetter(storedLetter)
      upgradeToken = stored.upgradeToken
      referralCode = stored.referralCode
    } catch (storeErr) {
      console.warn('Letter storage unavailable:', storeErr)
    }

    // Email the free letter. Best-effort and non-blocking on the response:
    // if Resend fails, the user still sees their letter on screen and the
    // email row is already persisted above for Phase 2 to pick up.
    if (email) {
      try {
        await sendFreeLetterEmail(email, {
          ...storedLetter,
          upgradeToken: upgradeToken || undefined,
          // Read back from the insert, so the share link in the email is the
          // same code the share block on /preview shows.
          referralCode,
        })
      } catch (emailErr) {
        console.warn('Email delivery failed:', emailErr)
      }
    }

    return NextResponse.json({ letter: letterText, letterId, referralCode })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
}