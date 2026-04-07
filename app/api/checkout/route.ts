import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { tier, letterId, childName, recipientEmail } = await req.json()

    if (!tier || !letterId || !childName || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const url = await createCheckoutSession({ tier, letterId, childName, recipientEmail })
    return NextResponse.json({ url })

  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}