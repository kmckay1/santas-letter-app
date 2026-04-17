import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PRICES = {
  premium: {
    priceId: 'price_1TJe607Eq8l4ZGZZJ8209TWR',
    amount: 900,
    label: 'Premium PDF',
  },
  physical: {
    priceId: 'price_1TJe617Eq8l4ZGZZPbbuGKqG',
    amount: 2900,
    label: 'Real Mail',
  },
  bundle: {
    priceId: 'price_1TJe607Eq8l4ZGZZGZkFItRp',
    amount: 3500,
    label: 'Bundle (PDF + Mail)',
  },
  addChild: {
    priceId: 'price_1TJe607Eq8l4ZGZZ44a4C3ad',
    amount: 1500,
    label: 'Add a Child',
  },
}

export async function createCheckoutSession({
  tier,
  letterId,
  childName,
  recipientEmail,
  discount,
}: {
  tier: string
  letterId: string
  childName: string
  recipientEmail: string
  discount?: boolean
}): Promise<string> {
  const price = PRICES[tier as keyof typeof PRICES]
  if (!price) throw new Error(`Unknown tier: ${tier}`)

  const needsShipping = tier === 'physical' || tier === 'bundle'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: price.priceId, quantity: 1 }],
    mode: 'payment',
    customer_email: recipientEmail,
    ...(needsShipping && {
      shipping_address_collection: {
        allowed_countries: ['US', 'GB', 'NL', 'DE', 'FR', 'BE', 'AU', 'CA', 'IE', 'ES', 'IT', 'PT', 'SE', 'NO', 'DK', 'FI', 'PL'],
      },
    }),
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}&letter_id=${letterId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/preview?letter_id=${letterId}`,
    ...(discount && process.env.STRIPE_EARLYBIRD_PROMO_ID && {
      discounts: [{ promotion_code: process.env.STRIPE_EARLYBIRD_PROMO_ID }],
    }),
    metadata: { tier, letterId, childName, recipientEmail },
  })

  return session.url!
}