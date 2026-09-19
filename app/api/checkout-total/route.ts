import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// The success page reports a Purchase to the Meta Pixel and needs the amount the
// customer actually paid. That figure only exists on the Stripe session.
// success_url is built before checkout starts, so it cannot carry it: a promotion
// code entered during checkout changes the total afterwards. The page used to read
// a hardcoded list price out of the URL, which over-reported revenue by the full
// discount on every promo-code order.
//
// Retrieving a session needs the secret key, so the lookup lives here.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')

  // Checkout Session ids only. The prefix check keeps this from being used to
  // probe other Stripe objects that happen to be readable with the same key.
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Missing or invalid session_id' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    // Deliberately narrow. The session id already reaches the browser in
    // success_url so this exposes nothing new, but the session also carries the
    // customer's email and address, and none of that belongs in a response.
    return NextResponse.json({
      // Cents, after any discount. Null until the session is finalised.
      amountTotal: session.amount_total,
      currency: session.currency,
    })
  } catch (err) {
    console.error(`checkout-total lookup failed for ${sessionId}:`, err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 502 })
  }
}
