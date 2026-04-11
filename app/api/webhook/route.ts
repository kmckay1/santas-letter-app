import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendPhysicalLetter } from '@/lib/lob'
import { getLetter, markLetterFulfilled } from '@/lib/storage'
import { sendOrderConfirmationEmail, sendPremiumPDFEmail } from '@/lib/resend'
import { generatePremiumPDF } from '@/lib/pdf'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { tier, letterId, childName, recipientEmail } = session.metadata!

    try {
      const letterData = await getLetter(letterId)
      if (!letterData) {
        console.error(`Letter ${letterId} not found in KV`)
        return NextResponse.json({ received: true })
      }

      // 1. Generate & email premium PDF for premium and bundle tiers
      if (tier === 'premium' || tier === 'bundle') {
        console.log(`Generating premium PDF for ${childName}...`)
        const pdfBuffer = await generatePremiumPDF(letterData.child, letterData.letterText)
        await sendPremiumPDFEmail(recipientEmail, childName, pdfBuffer)
        console.log(`✅ Premium PDF emailed to ${recipientEmail}`)
      }

      // 2. Send physical letter via Lob for physical and bundle tiers
      if (tier === 'physical' || tier === 'bundle') {
        const shipping = (session as any).shipping_details
        if (shipping?.address) {
          await sendPhysicalLetter(
            {
              name: shipping.name || childName,
              address_line1: shipping.address.line1!,
              address_line2: shipping.address.line2 || undefined,
              address_city: shipping.address.city!,
              address_state: shipping.address.state!,
              address_zip: shipping.address.postal_code!,
              address_country: shipping.address.country!,
            },
            letterData.child,
            { content: letterData.letterText, childName, createdAt: letterData.createdAt }
          )
          console.log(`✅ Physical letter dispatched via Lob for ${childName}`)
        } else {
          console.error('No shipping address found for physical order')
        }
      }

      // 3. Order confirmation for all tiers
      await sendOrderConfirmationEmail(recipientEmail, childName, tier, letterId)
      await markLetterFulfilled(letterId, tier)
      console.log(`✅ Fulfilled ${tier} for ${childName}`)

    } catch (err) {
      console.error('Fulfillment error:', err)
    }
  }

  return NextResponse.json({ received: true })
}