import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PRICES = {
  free: { amount: 0, label: 'Free Letter' },
  premium: { amount: 900, label: 'Premium PDF — $9' },
  physical: { amount: 2900, label: 'Physical Mail — $29' },
  bundle: { amount: 3500, label: 'Bundle (PDF + Mail) — $35' },
}

export async function createCheckoutSession(
  tier: string,
  metadata: { tier: string; letterId: string; childName: string; recipientEmail: string },
  additionalChildren = 0
): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
const lineItems: any[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Santa's Letter — ${PRICES[tier as keyof typeof PRICES]?.label || tier}`,
          description: `A personalised letter from Santa for ${metadata.childName}`,
        },
        unit_amount: PRICES[tier as keyof typeof PRICES]?.amount || 0,
      },
      quantity: 1,
    },
  ]

  if (additionalChildren > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: `Additional Children (×${additionalChildren})` },
        unit_amount: 1500,
      },
      quantity: additionalChildren,
    })
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: metadata.recipientEmail,
    shipping_address_collection: {
      allowed_countries: ['US', 'GB', 'NL', 'DE', 'FR', 'BE', 'AU', 'CA'],
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}&letter_id=${metadata.letterId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/preview?letter_id=${metadata.letterId}`,
    metadata,
  })

  return session.url!
}