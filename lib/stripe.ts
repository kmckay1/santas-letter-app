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
  upgradeToken,
  discount,
  deliveryDate,
}: {
  tier: string
  letterId: string
  childName: string
  recipientEmail?: string
  upgradeToken?: string
  discount?: boolean
  deliveryDate?: string
}): Promise<string> {
  const price = PRICES[tier as keyof typeof PRICES]
  if (!price) throw new Error(`Unknown tier: ${tier}`)

  const needsShipping = tier === 'physical' || tier === 'bundle'
  const isUpgrade = !!upgradeToken

  function getActivePromoId(): string | null {
    if (!discount) return null
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    if (month < 6 || (month === 6 && day <= 30)) {
      return process.env.STRIPE_EARLYBIRD_PROMO_ID || null
    }
    if (month === 7 || (month === 8 && day <= 31)) {
      return process.env.STRIPE_SUMMER_PROMO_ID || null
    }
    return null
  }

  const promoId = getActivePromoId()

  // Cancel URL: upgrade flow returns to the upgrade page; legacy flow keeps existing behavior
  const cancelUrl = isUpgrade
    ? `${process.env.NEXT_PUBLIC_URL}/upgrade/${upgradeToken}`
    : `${process.env.NEXT_PUBLIC_URL}/preview?letter_id=${letterId}`

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: price.priceId, quantity: 1 }],
    mode: 'payment',
    // Pre-fill email only when provided (legacy flow). Upgrade flow lets Stripe collect.
    ...(recipientEmail && { customer_email: recipientEmail }),
    ...(needsShipping && {
      shipping_address_collection: {
        allowed_countries: ['US', 'GB', 'NL', 'DE', 'FR', 'BE', 'AU', 'CA', 'IE', 'ES', 'IT', 'PT', 'SE', 'NO', 'DK', 'FI', 'PL'],
      },
    }),
    // Stripe rejects a session that carries both `discounts` and
    // `allow_promotion_codes`, so these are spread as a single either/or rather
    // than as two independent options. Setting both threw at session creation,
    // which meant no checkout at all for that tier rather than a degraded promo.
    //
    // When a seasonal promotion is running it is applied automatically and the
    // code box is not offered; outside those windows the customer can enter a
    // dashboard-created code. The two are mutually exclusive by construction.
    ...(promoId
      ? { discounts: [{ promotion_code: promoId }] }
      : { allow_promotion_codes: true }),
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}&letter_id=${letterId}&tier=${tier}`,
    cancel_url: cancelUrl,
    metadata: {
      tier,
      letterId,
      childName,
      ...(recipientEmail && { recipientEmail }),
      ...(upgradeToken && { upgradeToken }),
      ...(deliveryDate && { delivery_date: deliveryDate }),
    },
  })

  return session.url!
}