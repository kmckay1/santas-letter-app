import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendPhysicalLetter, validateAddress } from '@/lib/stannp'
import { getLetter, getLetterByUpgradeToken, markLetterFulfilled } from '@/lib/storage'
import { sendOrderConfirmationEmail, sendPremiumPDFEmail, sendAddressCheckEmail } from '@/lib/resend'
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
    const { tier, letterId, upgradeToken, childName, delivery_date } = session.metadata!

    // Email source: metadata (legacy flow) → Stripe-collected (upgrade flow)
    const recipientEmail = session.metadata?.recipientEmail || session.customer_details?.email

    if (!recipientEmail) {
      console.error('No recipient email found in session metadata or customer_details')
      return NextResponse.json({ received: true })
    }

    try {
      // Resolve letter via upgrade_token (upgrade flow) or letter_id (original purchase flow)
      let letterData = null
      let resolvedLetterId = letterId

      if (upgradeToken) {
        letterData = await getLetterByUpgradeToken(upgradeToken)
        if (letterData) {
          resolvedLetterId = letterData.id
        }
      } else if (letterId) {
        letterData = await getLetter(letterId)
      }

      if (!letterData) {
        console.error(`Letter not found (letterId=${letterId}, upgradeToken=${upgradeToken})`)
        return NextResponse.json({ received: true })
      }

      // 1. Generate & email premium PDF for premium and bundle tiers (always immediate)
      if (tier === 'premium' || tier === 'bundle') {
        console.log(`Generating premium PDF for ${childName}...`)
        const pdfBuffer = await generatePremiumPDF(letterData.child, letterData.letterText)
        await sendPremiumPDFEmail(recipientEmail, childName, pdfBuffer)
        console.log(`✅ Premium PDF emailed to ${recipientEmail}`)
      }

      // Set when the postal service rejects the delivery address: the order is
      // recorded but left unsent and unfulfilled until the customer confirms it.
      let addressNeedsConfirmation = false

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

          // Validate before committing to mail. Fails open: only a definitive
          // rejection from Stannp pauses the order, never a timeout or outage.
          const addressCheck = await validateAddress(shippingData)
          if (addressCheck.ok && addressCheck.reason !== 'valid') {
            console.log(`Address check skipped for ${childName}: ${addressCheck.reason} (${addressCheck.detail})`)
          }

          const today = new Date().toISOString().split('T')[0]
          const earliestAllowed = process.env.PHYSICAL_MAIL_EARLIEST_SEND || '2026-11-22'
          const customerRequested = delivery_date || today
          // Clamp send date — physical letters never ship before December delivery window
          const sendAfter = customerRequested > earliestAllowed ? customerRequested : earliestAllowed

          const supabase = getSupabaseAdmin()

          if (!addressCheck.ok) {
            // Undeliverable address. Record the order so it is not lost, leave it
            // unsent, and ask the customer to confirm. Deliberately not marked
            // fulfilled, so it stays visible as outstanding.
            addressNeedsConfirmation = true

            await supabase.from('scheduled_letters').insert({
              stripe_session_id: session.id,
              letter_id: resolvedLetterId,
              child_name: childName,
              recipient_email: recipientEmail,
              tier,
              shipping: shippingData,
              letter_content: letterData.letterText,
              child_info: letterData.child,
              send_after: sendAfter,
              sent: false,
            })

            await sendAddressCheckEmail(recipientEmail, childName, shippingData)
            console.warn(
              `⚠️  Address rejected by Stannp for ${childName} — order recorded unsent, ` +
              `customer asked to confirm. session=${session.id}`
            )
          } else if (sendAfter <= today) {
            // Same-day send (only fires after Nov 22, 2026 in production)
            const result = await sendPhysicalLetter(
              shippingData,
              letterData.child,
              { content: letterData.letterText, childName, createdAt: letterData.createdAt }
            )
            console.log(`✅ Physical letter sent immediately via Stannp for ${childName}`)

            await supabase.from('scheduled_letters').insert({
              stripe_session_id: session.id,
              letter_id: resolvedLetterId,
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
              letter_id: resolvedLetterId,
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

      // 3. Order confirmation for all tiers. The customer paid, so they always get
      // a receipt — even when the address is being queried.
      await sendOrderConfirmationEmail(recipientEmail, childName, tier, resolvedLetterId)

      if (addressNeedsConfirmation) {
        console.warn(`⏸️  ${tier} for ${childName} awaiting address confirmation — not marked fulfilled`)
      } else {
        await markLetterFulfilled(resolvedLetterId, tier)
        console.log(`✅ Fulfilled ${tier} for ${childName}`)
      }

    } catch (err) {
      console.error('Fulfillment error:', err)
    }
  }

  return NextResponse.json({ received: true })
}