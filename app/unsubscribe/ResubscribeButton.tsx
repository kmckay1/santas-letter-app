'use client'

import { useState } from 'react'

interface Props {
  email: string
  token: string
}

export default function ResubscribeButton({ email, token }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleResubscribe() {
    setState('loading')
    try {
      const res = await fetch('/api/unsubscribe/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      })
      const data = await res.json()
      if (data.success) {
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <p style={{
        color: '#d4aa5a',
        fontSize: 14,
        margin: 0,
        fontStyle: 'italic',
      }}>
        ✓ You&rsquo;re back on the list. Welcome back.
      </p>
    )
  }

  if (state === 'error') {
    return (
      <p style={{
        color: '#c8382b',
        fontSize: 13,
        margin: 0,
      }}>
        Something went wrong. Please contact hello@santasletter.ai
      </p>
    )
  }

  return (
    <button
      onClick={handleResubscribe}
      disabled={state === 'loading'}
      style={{
        background: 'transparent',
        color: '#d4aa5a',
        padding: '10px 24px',
        border: '1px solid rgba(212,170,90,0.4)',
        borderRadius: 4,
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        opacity: state === 'loading' ? 0.5 : 1,
        fontFamily: 'Georgia, serif',
        fontSize: 14,
      }}
    >
      {state === 'loading' ? 'Resubscribing...' : 'Resubscribe me'}
    </button>
  )
}