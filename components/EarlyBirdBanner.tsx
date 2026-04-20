'use client'

import { useState, useEffect } from 'react'

type CampaignType = 'earlybird' | 'summer' | null

function getCampaign(): CampaignType {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  if (month < 6 || (month === 6 && day <= 30)) return 'earlybird'
  if (month === 7 || (month === 8 && day <= 31)) return 'summer'
  return null
}

function getTimeLeft(deadline: Date) {
  const diff = deadline.getTime() - new Date().getTime()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function EarlyBirdBanner() {
  const [campaign, setCampaign] = useState<CampaignType>(null)
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft>>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const c = getCampaign()
    setCampaign(c)
    if (!c) return
    if (sessionStorage.getItem('banner_dismissed')) {
      setDismissed(true)
      return
    }
    const deadline = c === 'earlybird'
      ? new Date('2026-06-30T23:59:59')
      : new Date('2026-08-31T23:59:59')
    setTimeLeft(getTimeLeft(deadline))
    const timer = setInterval(() => {
      const tl = getTimeLeft(deadline)
      setTimeLeft(tl)
      if (!tl) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!campaign || dismissed || !timeLeft) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  const units = [
    { value: timeLeft.days, label: 'd' },
    { value: timeLeft.hours, label: 'h' },
    { value: timeLeft.minutes, label: 'm' },
    { value: timeLeft.seconds, label: 's' },
  ]

  const isEarlyBird = campaign === 'earlybird'
  const bannerLabel = isEarlyBird ? '🎄 Early Bird — ' : '☀️ Christmas in July — '
  const cta = isEarlyBird ? 'Claim offer →' : 'Get the summer deal →'

  return (
    <div style={{
      position: 'fixed', top: 5, left: 0, right: 0, zIndex: 300,
      background: 'linear-gradient(90deg, #6B0F0F 0%, #9b1f1f 30%, #6B0F0F 100%)',
      borderBottom: '1px solid rgba(212,170,90,0.4)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 20, flexWrap: 'wrap',
    }}>

      <span style={{ fontSize: 14, color: '#d4aa5a', letterSpacing: '0.1em', fontFamily: "'Playfair Display', Georgia, serif" }}>
        {bannerLabel}<strong style={{ color: '#fff' }}>20% off all orders</strong>
      </span>

      <div style={{ width: 1, height: 18, background: 'rgba(212,170,90,0.35)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace' }}>
        {units.map(({ value, label }, i) => (
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

      <div style={{ width: 1, height: 18, background: 'rgba(212,170,90,0.35)' }} />

      <a
        href="/create"
        onClick={() => sessionStorage.setItem('earlybird', 'true')}
        style={{
          background: 'linear-gradient(135deg, #d4aa5a, #b8922a)',
          color: '#1a0a00', padding: '6px 18px', borderRadius: 3,
          fontSize: 13, textDecoration: 'none',
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
        }}>
        {cta}
      </a>

      <button
        onClick={() => { sessionStorage.setItem('banner_dismissed', '1'); setDismissed(true) }}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'rgba(245,234,216,0.45)',
          fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '4px 6px',
        }}
        aria-label="Dismiss"
      >x</button>

    </div>
  )
}