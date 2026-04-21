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

      // 1. Generate & email premium PDF for premium and bundle tiers
      if (tier === 'premium' || tier === 'bundle') {
        console.log(`Generating premium PDF for ${childName}...`)
        const pdfBuffer = await generatePremiumPDF(letterData.child, letterData.letterText)
        await sendPremiumPDFEmail(recipientEmail, childName, pdfBuffer)
        console.log(`✅ Premium PDF emailed to ${recipientEmail}`)
      }

      // 2. Schedule or immediately send physical letter
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
          const sendAfter = delivery_date || today

          // If send date is today, send immediately
          if (sendAfter <= today) {
            await sendPhysicalLetter(
              shippingData,
              letterData.child,
              { content: letterData.letterText, childName, createdAt: letterData.createdAt }
            )
            console.log(`✅ Physical letter sent immediately via Lob for ${childName}`)

            // Record as sent
            const supabase = getSupabaseAdmin()
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
            })
          } else {
            // Schedule for future delivery
            const supabase = getSupabaseAdmin()
            const { error } = await supabase.from('scheduled_letters').insert({
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
            if (error) {
              console.error('Failed to schedule letter:', error)
            } else {
              console.log(`✅ Physical letter scheduled for ${sendAfter} for ${childName}`)
            }
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