import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { getLetterByUpgradeToken } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tier, letterId, childName, recipientEmail, discount, deliveryDate, upgradeToken } = body

    if (!tier) {
      return NextResponse.json({ error: 'Missing tier' }, { status: 400 })
    }

    // Upgrade flow: resolve letter server-side from token (do not trust client-supplied child data)
    if (upgradeToken) {
      const letter = await getLetterByUpgradeToken(upgradeToken)
      if (!letter) {
        return NextResponse.json({ error: 'Invalid upgrade link' }, { status: 404 })
      }
      const url = await createCheckoutSession({
        tier,
        letterId: letter.id,
        childName: letter.child.name,
        upgradeToken,
        discount,
        deliveryDate,
        // recipientEmail omitted — Stripe collects at checkout
      })
      return NextResponse.json({ url })
    }

    // Legacy flow: client supplies all fields
    if (!letterId || !childName || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const url = await createCheckoutSession({
      tier,
      letterId,
      childName,
      recipientEmail,
      discount,
      deliveryDate,
    })
    return NextResponse.json({ url })

  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}