'use client'

import { useState } from 'react'

interface Props {
  email: string
  token: string
  alreadyUnsubscribed: boolean
}

type View = 'unsubscribed' | 'resubscribed'

export default function UnsubscribedCard({ email, token, alreadyUnsubscribed }: Props) {
  const [view, setView] = useState<View>('unsubscribed')
  const [resubscribing, setResubscribing] = useState(false)
  const [error, setError] = useState(false)

  async function handleResubscribe() {
    setResubscribing(true)
    setError(false)
    try {
      const res = await fetch('/api/unsubscribe/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      })
      const data = await res.json()
      if (data.success) {
        setView('resubscribed')
      } else {
        setError(true)
        setResubscribing(false)
      }
    } catch {
      setError(true)
      setResubscribing(false)
    }
  }

  // Resubscribed — full card swap, no stale messaging
  if (view === 'resubscribed') {
    return (
      <div style={{
        background: 'rgba(212,170,90,0.06)',
        border: '1px solid rgba(212,170,90,0.4)',
        borderRadius: 6,
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎄</div>
        <h1 style={{ fontSize: 26, fontWeight: 400, margin: '0 0 16px', color: '#f5ead8' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7, margin: 0 }}>
          You&rsquo;re back on the list for <strong style={{ color: '#f5ead8' }}>{email}</strong>. Santa will be glad to hear it.
        </p>
      </div>
    )
  }

  // Default — unsubscribed
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(212,170,90,0.3)',
      borderRadius: 6,
      padding: '40px 32px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
      <h1 style={{ fontSize: 26, fontWeight: 400, margin: '0 0 16px', color: '#f5ead8' }}>
        {alreadyUnsubscribed ? 'You\u2019re already unsubscribed' : 'You\u2019ve been unsubscribed'}
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7, margin: '0 0 24px' }}>
        We won&rsquo;t send any more emails to <strong style={{ color: '#f5ead8' }}>{email}</strong>.
        {!alreadyUnsubscribed && ' Sorry to see you go — Santa hopes Christmas is still magical for your family.'}
      </p>

      <div style={{
        borderTop: '1px solid rgba(245,234,216,0.1)',
        paddingTop: 24,
        marginTop: 24,
      }}>
        <p style={{ fontSize: 13, color: 'rgba(245,234,216,0.5)', margin: '0 0 16px' }}>
          Changed your mind?
        </p>

        {error ? (
          <p style={{ color: '#c8382b', fontSize: 13, margin: 0 }}>
            Something went wrong. Please contact hello@santasletter.ai
          </p>
        ) : (
          <button
            onClick={handleResubscribe}
            disabled={resubscribing}
            style={{
              background: 'transparent',
              color: '#d4aa5a',
              padding: '10px 24px',
              border: '1px solid rgba(212,170,90,0.4)',
              borderRadius: 4,
              cursor: resubscribing ? 'not-allowed' : 'pointer',
              opacity: resubscribing ? 0.5 : 1,
              fontFamily: 'Georgia, serif',
              fontSize: 14,
            }}
          >
            {resubscribing ? 'Resubscribing...' : 'Resubscribe me'}
          </button>
        )}
      </div>
    </div>
  )
}