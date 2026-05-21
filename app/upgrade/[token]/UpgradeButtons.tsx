'use client'

import { useState } from 'react'

interface Props {
  upgradeToken: string
  childName: string
  alreadyUpgraded: boolean
}

interface Tier {
  id: 'premium' | 'physical' | 'bundle'
  title: string
  price: string
  description: string
  highlight?: boolean
  features: string[]
}

const TIERS: Tier[] = [
  {
    id: 'premium',
    title: 'Premium PDF',
    price: '$9',
    description: 'Beautifully illustrated, instant download',
    features: [
      'Official North Pole letterhead',
      'Hand-script fonts, gold borders',
      'Delivered to your inbox in minutes',
      'Print as many copies as you want',
    ],
  },
  {
    id: 'bundle',
    title: 'PDF + Physical Letter',
    price: '$35',
    description: 'Premium PDF plus a real letter in the post',
    highlight: true,
    features: [
      'Everything in Premium PDF',
      'Hand-stamped letter mailed in December',
      'Arrives before Christmas, postmarked',
      'Best value — save $3',
    ],
  },
  {
    id: 'physical',
    title: 'Physical Letter',
    price: '$29',
    description: 'A real letter, mailed from the North Pole',
    features: [
      'Printed on premium paper',
      'Hand-stamped envelope',
      'Mailed in December',
      'Arrives in time for Christmas',
    ],
  },
]

export default function UpgradeButtons({ upgradeToken, alreadyUpgraded }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(tier: Tier['id']) {
    setLoading(tier)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          upgradeToken,
          // childName and recipientEmail are resolved server-side from the token
          // and Stripe checkout respectively — never trusted from client
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Something went wrong. Please try again or contact hello@santasletter.ai')
        setLoading(null)
      }
    } catch (err) {
      console.error(err)
      alert('Something went wrong. Please try again or contact hello@santasletter.ai')
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {TIERS.map(tier => (
        <div
          key={tier.id}
          style={{
            background: tier.highlight ? 'rgba(212,170,90,0.08)' : 'rgba(255,255,255,0.04)',
            border: tier.highlight ? '1px solid rgba(212,170,90,0.4)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: 24,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {tier.highlight && (
            <div style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#d4aa5a',
              color: '#0d1b2e',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: 12,
              fontWeight: 600,
            }}>
              Most popular
            </div>
          )}

          <h3 style={{ fontSize: 18, margin: '0 0 4px', color: '#f5ead8', fontWeight: 400 }}>
            {tier.title}
          </h3>
          <p style={{ fontSize: 28, margin: '0 0 8px', color: '#d4aa5a', fontFamily: 'Georgia, serif' }}>
            {tier.price}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(245,234,216,0.55)', margin: '0 0 16px', minHeight: 36, lineHeight: 1.5 }}>
            {tier.description}
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: 12, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7, flex: 1 }}>
            {tier.features.map((f, i) => (
              <li key={i} style={{ paddingLeft: 16, position: 'relative', marginBottom: 4 }}>
                <span style={{ position: 'absolute', left: 0, color: '#d4aa5a' }}>✦</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleUpgrade(tier.id)}
            disabled={loading !== null || alreadyUpgraded}
            style={{
              background: tier.highlight
                ? 'linear-gradient(135deg,#c8382b,#9b1f1f)'
                : 'rgba(255,255,255,0.06)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: 4,
              border: tier.highlight ? 'none' : '1px solid rgba(245,234,216,0.2)',
              cursor: (loading !== null || alreadyUpgraded) ? 'not-allowed' : 'pointer',
              opacity: (loading !== null || alreadyUpgraded) ? 0.5 : 1,
              fontSize: 14,
              fontFamily: 'Georgia, serif',
              width: '100%',
            }}
          >
            {loading === tier.id ? 'Loading...' : alreadyUpgraded ? 'Already upgraded' : `Get ${tier.title}`}
          </button>
        </div>
      ))}
    </div>
  )
}