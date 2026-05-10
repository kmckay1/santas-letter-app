import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendPhysicalLetter } from '@/lib/lob'
import { getLetter, markLetterFulfilled } from '@/lib/storage'
import { sendOrderConfirmationEmail, sendPremiumPDFEmail } from '@/lib/resend'
import { generatePremiumPDF } from '@/lib/pdf'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
    const { tier, letterId, childName, recipientEmail, delivery_date } = session.metadata!

    try {
      const letterData = await getLetter(letterId)
      if (!letterData) {
        console.error(`Letter ${letterId} not found`)
        return NextResponse.json({ received: true })
      }

      // 1. Generate & email premium PDF for premium and bundle tiers (always immediate)
      if (tier === 'premium' || tier === 'bundle') {
        console.log(`Generating premium PDF for ${childName}...`)
        const pdfBuffer = await generatePremiumPDF(letterData.child, letterData.letterText)
        await sendPremiumPDFEmail(recipientEmail, childName, pdfBuffer)
        console.log(`✅ Premium PDF emailed to ${recipientEmail}`)
      }

      // 2. Schedule or immediately send physical letter
      // Physical letters are clamped to never ship before the December delivery window,
      // regardless of customer-selected date. Set PHYSICAL_MAIL_EARLIEST_SEND env var
      // to override the default of 2026-11-22.
      if (tier === 'physical' || tier === 'bundle') {
        const fullSession = await stripe.checkout.sessions.retrieve(session.id)
        const shipping = (fullSession as any).shipping_details

        if (shipping?.address) {
          const shippingData = {
            name: shipping.name || childName,
            address_line1: shipping.address.line1!,
            address_line2: shipping.address.line2 || undefined,
            address_city: shipping.address.city!,
            address_state: shipping.address.state!,
            address_zip: shipping.address.postal_code!,
            address_country: shipping.address.country!,
          }

          const today = new Date().toISOString().split('T')[0]
          const earliestAllowed = process.env.PHYSICAL_MAIL_EARLIEST_SEND || '2026-11-22'
          const customerRequested = delivery_date || today
          // Clamp send date — physical letters never ship before December delivery window
          const sendAfter = customerRequested > earliestAllowed ? customerRequested : earliestAllowed

          const supabase = getSupabaseAdmin()

          if (sendAfter <= today) {
            // Same-day send (only fires after Nov 22, 2026 in production)
            const result = await sendPhysicalLetter(
              shippingData,
              letterData.child,
              { content: letterData.letterText, childName, createdAt: letterData.createdAt }
            )
            console.log(`✅ Physical letter sent immediately via Lob for ${childName}`)

            await supabase.from('scheduled_letters').insert({
              stripe_session_id: session.id,
              letter_id: letterId,
              child_name: childName,
              recipient_email: recipientEmail,
              tier,
              shipping: shippingData,
              letter_content: letterData.letterText,
              child_info: letterData.child,
              send_after: sendAfter,
              sent: true,
              sent_at: new Date().toISOString(),
              lob_letter_id: result.id,
            })
          } else {
            // Scheduled send (default path during pre-holiday window)
            await supabase.from('scheduled_letters').insert({
              stripe_session_id: session.id,
              letter_id: letterId,
              child_name: childName,
              recipient_email: recipientEmail,
              tier,
              shipping: shippingData,
              letter_content: letterData.letterText,
              child_info: letterData.child,
              send_after: sendAfter,
              sent: false,
            })
            console.log(`✅ Physical letter scheduled for ${sendAfter} for ${childName}`)
          }
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