'use client'

import { useState, useEffect } from 'react'

function getTimeLeft() {
  const deadline = new Date('2026-12-25T23:59:59')
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function EarlyBirdBanner() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft())
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if dismissed in this session
    if (sessionStorage.getItem('earlybird_dismissed')) {
      setDismissed(true)
      return
    }
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (dismissed || !timeLeft) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div style={{
      position: 'fixed', top: 5, left: 0, right: 0, zIndex: 300,
      background: 'linear-gradient(90deg, #6B0F0F 0%, #9b1f1f 30%, #6B0F0F 100%)',
      borderBottom: '1px solid rgba(212,170,90,0.4)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 20, flexWrap: 'wrap',
    }}>
      {/* Left: label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, color: '#d4aa5a', letterSpacing: '0.1em', fontFamily: "'Playfair Display', Georgia, serif" }}>
          🎄 Early Bird — <strong style={{ color: '#fff' }}>20% off all orders</strong>
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: 'rgba(212,170,90,0.35)' }} />

      {/* Countdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace' }}>
        {[
          { value: timeLeft.days, label: 'd' },
          { value: timeLeft.hours, label: 'h' },
          { value: timeLeft.minutes, label: 'm' },
          { value: timeLeft.seconds, label: 's' },
        ].map(({ value, label }, i) => (
          <span key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            {i > 0 && <span style={{ color: 'rgba(212,170,90,0.5)', marginRight: 4 }}>:</span>}
            <span style={{
              background: 'rgba(0,0,0,0.3)', borderRadius: 3,
              padding: '2px 6px', fontSize: 14, color: '#fff', fontWeight: 700,
              minWidth: 28, textAlign: 'center',
            }}>{pad(value)}</span>
            <span style={{ fontSize: 10, color: 'rgba(212,170,90,0.7)', marginLeft: 2 }}>{label}</span>
          </span>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: 'rgba(212,170,90,0.35)' }} />

      {/* CTA */}
      <a href="/create" style={{
        background: 'linear-gradient(135deg, #d4aa5a, #b8922a)',
        color: '#1a0a00', padding: '6px 18px', borderRadius: 3,
        fontSize: 13, textDecoration: 'none',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        Claim offer →
      </a>

      {/* Dismiss */}
      <button
        onClick={() => { sessionStorage.setItem('earlybird_dismissed', '1'); setDismissed(true) }}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'rgba(245,234,216,0.45)',
          fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '4px 6px',
        }}
        aria-label="Dismiss"
      >×</button>
    </div>
  )
}