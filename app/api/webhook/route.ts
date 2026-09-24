import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendPhysicalLetter, validateAddress } from '@/lib/stannp'
import {
  getLetter,
  getLetterByUpgradeToken,
  markLetterFulfilled,
  claimWebhookSession,
  markSessionPremiumPdfSent,
  markSessionCompleted,
  mergeTier,
} from '@/lib/storage'
import { sendOrderConfirmationEmail, sendAddressCheckEmail } from '@/lib/resend'
import { createClient } from '@supabase/supabase-js'
import { deliverPremiumPdf } from '@/lib/fulfillment'
import Stripe from 'stripe'
import * as Sentry from '@sentry/nextjs'
import { sendAlert } from '@/lib/alert'

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
      Sentry.captureMessage(`Paid order with no recipient email — session=${session.id}`, 'error')
      await sendAlert(`🚨 Paid order with no recipient email. Stripe session ${session.id}. Returning 500 so Stripe retries.`)
      // Refuse to acknowledge: a 200 here told Stripe a paid order was handled
      // when nothing had been delivered. A 500 keeps it visible and retried.
      return NextResponse.json({ error: 'No recipient email' }, { status: 500 })
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
        // A paid order with no letter row is an emergency, not a no-op. Refusing to
        // acknowledge keeps the event visible in Stripe and gets it retried, rather
        // than silently dropping a charge the way this did for 91 days.
        console.error(
          `🚨 PAID ORDER WITH NO LETTER — session=${session.id} letterId=${letterId} ` +
          `upgradeToken=${upgradeToken}. Returning 500 so Stripe retries.`
        )
        Sentry.captureException(new Error(`Paid order with no letter — session=${session.id}`))
        await sendAlert(`🚨 PAID ORDER WITH NO LETTER. Stripe session ${session.id}. Returning 500 so Stripe retries.`)
        return NextResponse.json({ error: 'Letter not found' }, { status: 500 })
      }

      // Replay guard, keyed on the Stripe session. Stripe redelivers on timeout as
      // well as on error, and this handler does slow work (PDF render, Stannp
      // send), so redelivery is likely rather than exotic.
      //
      // This used to ask whether the *letter* was fulfilled, which cannot tell a
      // redelivery apart from a genuine second purchase. A customer who bought
      // premium and later bought physical against the same letter produced a new,
      // distinct session that was silently acknowledged as a replay: charged, and
      // delivered nothing. Only the same session arriving twice is a replay.
      const priorSession = await claimWebhookSession(session.id, resolvedLetterId, tier)
      if (priorSession?.completedAt) {
        console.log(
          `Stripe session ${session.id} already processed at ${priorSession.completedAt} ` +
          `(letter ${resolvedLetterId}, ${childName}) — acknowledging replay`
        )
        return NextResponse.json({ received: true, replay: true })
      }
      if (priorSession) {
        console.log(
          `Stripe session ${session.id} was started but not completed — resuming; ` +
          `each step below is separately guarded`
        )
      }

      // 1. Generate & email premium PDF for premium and bundle tiers (always immediate)
      if (tier === 'premium' || tier === 'bundle') {
        // Scoped to this session, not the letter. A customer who already owns a
        // PDF from an earlier purchase and pays for another premium-bearing tier
        // has bought a second delivery, so the letter-level stamp must not
        // suppress it. Within one session, the stamp still makes a retry safe.
        if (priorSession?.premiumPdfSentAt) {
          console.log(
            `Premium PDF already sent for session ${session.id} at ` +
            `${priorSession.premiumPdfSentAt} — skipping`
          )
        } else {
          console.log(`Generating premium PDF for ${childName}...`)
          // Shared with the referral grant. Renders, emails, and writes the
          // letter-level record; the session-scoped guard below stays here
          // because it is this caller's rule, not the shared path's.
          await deliverPremiumPdf(letterData, recipientEmail)
          // Stamped immediately after sending: a failure further down this handler
          // must not cost the customer a duplicate PDF on the retry.
          await markSessionPremiumPdfSent(session.id)
          console.log(`✅ Premium PDF emailed to ${recipientEmail}`)
        }
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
          const supabase = getSupabaseAdmin()

          // Replay guard for the physical half. If this session already produced a
          // scheduled row then validation, the address email and the insert have all
          // happened; re-running them would duplicate the letter and the email. The
          // unique index on stripe_session_id is the structural backstop against a
          // race; this check also stops the customer being emailed twice.
          const { data: alreadyScheduled, error: scheduledLookupError } = await supabase
            .from('scheduled_letters')
            .select('id')
            .eq('stripe_session_id', session.id)
            .limit(1)
          if (scheduledLookupError) {
            throw new Error(`scheduled_letters lookup failed: ${scheduledLookupError.message}`)
          }

          if (alreadyScheduled && alreadyScheduled.length > 0) {
            console.log(`Physical letter already scheduled for session ${session.id} — skipping`)
          } else {
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
          }
        } else {
          // Stop before the confirmation email and the fulfilled flag: a paid
          // physical order with nowhere to post it must stay outstanding. A
          // premium PDF already sent for a bundle is stamped on the session above,
          // so Stripe's retries will not send it twice.
          console.error(`No shipping address found for physical order — session=${session.id}. Returning 500 so Stripe retries.`)
          Sentry.captureMessage(`Physical order with no shipping address — session=${session.id}`, 'error')
          await sendAlert(`🚨 Paid ${tier} order with no shipping address. Stripe session ${session.id}. Not fulfilled; returning 500 so Stripe retries.`)
          return NextResponse.json({ error: 'No shipping address' }, { status: 500 })
        }
      }

      // 3. Order confirmation for all tiers. The customer paid, so they always get
      // a receipt — even when the address is being queried.
      await sendOrderConfirmationEmail(recipientEmail, childName, tier, resolvedLetterId)

      if (addressNeedsConfirmation) {
        console.warn(`⏸️  ${tier} for ${childName} awaiting address confirmation — not marked fulfilled`)
      } else {
        // Merge rather than overwrite: a second purchase adds an entitlement, it
        // does not replace the one already paid for.
        const nextTier = mergeTier(letterData.tier, tier)
        await markLetterFulfilled(resolvedLetterId, nextTier)
        console.log(
          `✅ Fulfilled ${tier} for ${childName}` +
          (nextTier === tier ? '' : ` (letter tier now ${nextTier})`)
        )
      }

      // Closed out even when the address is still being queried: the webhook's own
      // work for this session is done, and a redelivery must not resend the
      // confirmation email. What remains is the customer confirming their address.
      await markSessionCompleted(session.id)

      return NextResponse.json({ received: true })

    } catch (err) {
      // Everything reaching here is transient or infrastructural: a Supabase read,
      // a PDFShift render, a Resend send, a Stannp call. Refuse to acknowledge so
      // Stripe retries with backoff. The guards above make redelivery safe — an
      // already-fulfilled order short-circuits, the premium PDF is stamped once,
      // and the physical insert is keyed on stripe_session_id.
      //
      // Deliberately NOT reaching here: an address Stannp rejects. That is a handled
      // business outcome, acknowledged with a 200, because no amount of retrying
      // fixes a customer's typo.
      console.error(`Fulfillment error for session ${session.id}:`, err)
      Sentry.captureException(err, { tags: { stripe_session: session.id } })
      await sendAlert(`🚨 Fulfillment error for Stripe session ${session.id}: ${err instanceof Error ? err.message : String(err)}. Returning 500 so Stripe retries.`)
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}