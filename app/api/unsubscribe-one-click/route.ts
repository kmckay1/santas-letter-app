import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken, markUnsubscribed } from '@/lib/unsubscribe'
import * as Sentry from '@sentry/nextjs'
import { sendAlert } from '@/lib/alert'

// RFC 8058 one-click unsubscribe, the target of the List-Unsubscribe header.
// Mail providers POST here with the body `List-Unsubscribe=One-Click`; the
// email and token ride in the URL built by generateOneClickUnsubscribeUrl.
//
// POST only. Link scanners and prefetchers issue GETs, and RFC 8058 relies on
// POST so that merely fetching the URL never unsubscribes anyone.
//
// Always answers 200: the caller is a mail provider with no retry and no UI to
// show an error. Failures are logged instead, and `ok` records the outcome.
export async function POST(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim()
  const token = req.nextUrl.searchParams.get('token')

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    console.error('One-click unsubscribe rejected: missing or invalid email/token')
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  try {
    await markUnsubscribed(email)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('One-click unsubscribe failed to save:', err)
    Sentry.captureException(err)
    // The mail client has already told this person they are unsubscribed, so a
    // lost save means mailing someone who opted out. The address is included
    // because it is what has to be unsubscribed by hand.
    await sendAlert(
      `🚨 One-click unsubscribe failed to save for ${email}. ` +
      `They were told they are unsubscribed; mark them unsubscribed manually.`
    )
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
