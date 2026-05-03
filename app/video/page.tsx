'use client'
import { useState } from 'react'
import Link from 'next/link'
import { trackCustomEvent } from '@/lib/pixel'

export default function VideoWaitlistPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'video_waitlist' }),
      })
      if (!res.ok) throw new Error('Failed')
      trackCustomEvent('VideoWaitlistSignup')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0d1f3c 0%, #060e1c 60%)', color: '#f5ead8', fontFamily: "'Lora', Georgia, serif", padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Top ribbon */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F)', zIndex: 200 }} />

      {/* Subtle starfield */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 5 === 0 ? 2 : 1,
            height: i % 5 === 0 ? 2 : 1,
            background: '#fff',
            borderRadius: '50%',
            opacity: 0.1 + (i % 6) * 0.06,
            top: `${(i * 6.7) % 100}%`,
            left: `${(i * 4.9) % 100}%`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 880, margin: '0 auto' }}>

        {/* Header / nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 60px' }}>
          <Link href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: 20, color: '#d4aa5a', textDecoration: 'none' }}>
            SantasLetter<span style={{ color: 'rgba(245,234,216,0.5)' }}>.ai</span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(245,234,216,0.55)', textDecoration: 'none' }}>← Back to letters</Link>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,170,90,0.6))' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a' }}>Coming October 2026</span>
            <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, rgba(212,170,90,0.6), transparent)' }} />
          </div>

          <div style={{ fontSize: 64, marginBottom: 20, filter: 'drop-shadow(0 12px 32px rgba(200,56,43,0.5))' }}>🎬</div>

          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(36px, 7vw, 60px)', lineHeight: 1.1, color: '#f5ead8', margin: '0 0 20px', fontWeight: 400 }}>
            A personalised video<br /><em style={{ color: '#d4aa5a', fontStyle: 'italic' }}>from Santa himself</em>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(245,234,216,0.75)', margin: '0 auto 36px', lineHeight: 1.7, maxWidth: 540 }}>
            Watch Santa speak your child&apos;s name, mention their wishes, and acknowledge their kind deeds — in a magical HD video they&apos;ll watch over and over.
          </p>

          {/* Mock video preview frame */}
          <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto 44px', borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,170,90,0.25)' }}>
            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #1a0f08 0%, #2c1810 50%, #1a0f08 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(212,170,90,0.15) 0%, transparent 60%)' }} />
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ fontSize: 96, marginBottom: 8, filter: 'drop-shadow(0 8px 24px rgba(200,56,43,0.6))' }}>🎅</div>
                <div style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(212,170,90,0.6)' }}>Preview coming soon</div>
              </div>
              <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,234,216,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(245,234,216,0.6)' }}>▶</div>
                <div style={{ flex: 1, height: 3, background: 'rgba(245,234,216,0.2)', borderRadius: 2, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '20%', height: '100%', background: '#d4aa5a', borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(245,234,216,0.5)' }}>0:18 / 1:30</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', background: 'rgba(212,170,90,0.08)', border: '1px solid rgba(212,170,90,0.25)', borderRadius: 100, fontSize: 13, color: '#d4aa5a' }}>
            <span style={{ fontSize: 14 }}>✦</span>
            <span>Early waitlist members get 30% off launch price</span>
          </div>
        </div>

        {/* What you'll get section */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 8, textAlign: 'center' }}>✦ what makes it magical ✦</div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#f5ead8', fontWeight: 400, margin: '0 0 36px', textAlign: 'center' }}>Made just for your child</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            {[
              { icon: '🎙️', title: 'Speaks their name', body: 'Santa addresses your child by name throughout, just like in the letters' },
              { icon: '🎁', title: 'Mentions their wishes', body: 'A few things from their wishlist woven in, in Santa\'s warm voice' },
              { icon: '⭐', title: 'Acknowledges kindness', body: 'A specific kind thing they did this year — tied to your details' },
              { icon: '📥', title: 'HD download', body: 'Yours to keep, share with grandparents, or save as a yearly tradition' },
            ].map((f) => (
              <div key={f.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,170,90,0.18)', borderRadius: 10, padding: '24px 22px' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, color: '#f5ead8', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 8, textAlign: 'center' }}>✦ how it works ✦</div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#f5ead8', fontWeight: 400, margin: '0 0 36px', textAlign: 'center' }}>Three simple steps</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'center' }}>
            {[
              { n: '01', title: 'Tell Santa about them', body: 'Name, age, a wish or two, a kind thing they did' },
              { n: '02', title: 'The elves film it', body: 'Personalised video produced in minutes' },
              { n: '03', title: 'Watch the magic', body: 'Stream or download to share whenever you like' },
            ].map((s) => (
              <div key={s.n}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 44, color: 'rgba(212,170,90,0.18)', lineHeight: 1, marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, color: '#f5ead8', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,234,216,0.7)', lineHeight: 1.6 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing tease */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,170,90,0.2)', borderRadius: 10, padding: '32px 40px', marginBottom: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 18 }}>✦ launch pricing ✦</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 18, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: 'rgba(245,234,216,0.4)', textDecoration: 'line-through' }}>$34.99</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 44, color: '#d4aa5a' }}>$24.50</div>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(245,234,216,0.7)' }}>Waitlist members only · 30% off forever for early supporters</div>
        </div>

        {/* Email capture */}
        <div id="signup" style={{ background: 'linear-gradient(135deg, rgba(212,170,90,0.08) 0%, rgba(180,130,50,0.04) 100%)', border: '1px solid rgba(212,170,90,0.3)', borderRadius: 12, padding: '40px 44px', marginBottom: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🎁</div>
          <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 12 }}>✦ join the waitlist ✦</div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#f5ead8', fontWeight: 400, margin: '0 0 12px', lineHeight: 1.3 }}>
            Be first when Santa starts filming
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(245,234,216,0.65)', margin: '0 0 28px', lineHeight: 1.7, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
            We&apos;ll email you the moment the video product launches in October — with your 30% early-access discount built in.
          </p>

          {status === 'success' ? (
            <div style={{ background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '20px 28px', borderRadius: 8, maxWidth: 460, margin: '0 auto' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: '#f5ead8', marginBottom: 6 }}>You&apos;re on the list</div>
              <div style={{ fontSize: 13, color: 'rgba(245,234,216,0.7)' }}>Check your inbox for confirmation. We&apos;ll be in touch when Santa is ready to film.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, maxWidth: 460, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                required
                style={{ flex: 1, minWidth: 220, padding: '14px 18px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(245,234,216,0.2)', borderRadius: 4, color: '#f5ead8', fontFamily: 'Georgia, serif', fontSize: 15, outline: 'none' }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #d4aa5a, #a8802a)', color: '#0d1b2e', border: 'none', borderRadius: 4, cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                {status === 'loading' ? 'Joining...' : '✦ Join the waitlist'}
              </button>
              {status === 'error' && <p style={{ width: '100%', color: '#f09595', fontSize: 12, margin: '4px 0 0' }}>Something went wrong — please check your email and try again.</p>}
            </form>
          )}
          <p style={{ fontSize: 11, color: 'rgba(245,234,216,0.3)', margin: '14px 0 0' }}>No spam · One launch email · Unsubscribe anytime</p>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 8, textAlign: 'center' }}>✦ questions ✦</div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#f5ead8', fontWeight: 400, margin: '0 0 28px', textAlign: 'center' }}>Frequently asked</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { q: 'When does the video product launch?', a: 'October 2026, in time for Christmas. We\'ll email everyone on the waitlist the moment it goes live.' },
              { q: 'How is the video personalised?', a: 'You provide your child\'s name, age, a wish or two, and something kind they did this year. We use this to create a custom video where Santa speaks directly to them, by name.' },
              { q: 'Will I be charged when I join the waitlist?', a: 'No — joining the waitlist is completely free. You\'ll only pay if and when you decide to order a video after launch, and you\'ll get 30% off as a thank you for being early.' },
              { q: 'Can I still order a letter today?', a: 'Yes! Letters are available now at SantasLetter.ai/create. The video is a separate product launching later this year.' },
              { q: 'What if I change my mind?', a: 'You can unsubscribe from the waitlist anytime — no questions asked, no spam.' },
            ].map((f, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,170,90,0.15)', borderRadius: 8, padding: '20px 24px' }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, color: '#f5ead8', marginBottom: 10, lineHeight: 1.4 }}>{f.q}</div>
                <div style={{ fontSize: 14, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(212,170,90,0.12)', paddingTop: 32, textAlign: 'center', fontSize: 12, color: 'rgba(245,234,216,0.5)', lineHeight: 1.8 }}>
          SantasLetter.ai · Made with ❤ in San Francisco · © 2026<br />
          <Link href="/privacy" style={{ color: 'rgba(245,234,216,0.45)', textDecoration: 'none', marginRight: 16 }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: 'rgba(245,234,216,0.45)', textDecoration: 'none', marginRight: 16 }}>Terms of Service</Link>
          <Link href="/" style={{ color: 'rgba(245,234,216,0.45)', textDecoration: 'none' }}>Back to letters</Link>
        </div>

      </div>
    </main>
  )
}