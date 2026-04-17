'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import EarlyBirdBanner from '../components/EarlyBirdBanner'

function Snowflakes() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const flakes = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5,
      speed: Math.random() * 1.0 + 0.3,
      wind: Math.random() * 0.5 - 0.25,
      opacity: Math.random() * 0.55 + 0.15,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.02 + 0.005,
    }))

    let animId: number
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      flakes.forEach(f => {
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210, 235, 255, ${f.opacity})`
        ctx.fill()
        f.y += f.speed
        f.wobble += f.wobbleSpeed
        f.x += f.wind + Math.sin(f.wobble) * 0.4
        if (f.y > canvas.height + 5) { f.y = -5; f.x = Math.random() * canvas.width }
        if (f.x > canvas.width) f.x = 0
        if (f.x < 0) f.x = canvas.width
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }} />
}

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0d1f3c 0%, #060e1c 60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Lora', Georgia, serif", color: '#f5ead8', textAlign: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>

      <Snowflakes />

      <EarlyBirdBanner />

      {/* Top ribbon */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F)', zIndex: 200 }} />

      {/* Stars */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {Array.from({ length: 60 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', width: i % 8 === 0 ? 2 : 1, height: i % 8 === 0 ? 2 : 1, background: '#fff', borderRadius: '50%', opacity: 0.1 + (i % 6) * 0.06, top: `${(Math.sin(i * 1.7) * 45 + 50)}%`, left: `${(i * 5.9) % 100}%` }} />
        ))}
      </div>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, background: 'radial-gradient(ellipse, rgba(200,56,43,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Content — wider max width */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, width: '100%' }}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,170,90,0.6))' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a' }}>Official North Pole Correspondence</span>
          <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, rgba(212,170,90,0.6), transparent)' }} />
        </div>

        {/* Santa emoji */}
        <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 12px 32px rgba(200,56,43,0.5))' }}>🎅</div>

        {/* Headline */}
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(36px, 7vw, 62px)', lineHeight: 1.1, color: '#f5ead8', margin: '0 0 16px', fontWeight: 400 }}>
          A letter from Santa,<br /><em style={{ color: '#d4aa5a', fontStyle: 'italic' }}>written just for them</em>
        </h1>

        <p style={{ fontSize: 17, color: 'rgba(245,234,216,0.75)', margin: '0 0 40px', lineHeight: 1.75, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          Personalised letters from the North Pole — free to read, beautiful to keep, magical to receive.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
          <Link href="/create" style={{
            background: 'linear-gradient(135deg, #c8382b 0%, #9b1f1f 100%)',
            color: '#fff', padding: '16px 36px', borderRadius: 4,
            fontSize: 17, textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: '0.04em', boxShadow: '0 8px 28px rgba(200,56,43,0.45)',
            display: 'inline-block',
          }}>
            ✦ Write my child&apos;s letter
          </Link>
          <a href="#how-it-works" style={{ background: 'transparent', color: '#d4aa5a', padding: '16px 32px', borderRadius: 4, fontSize: 16, textDecoration: 'none', border: '1px solid rgba(212,170,90,0.35)', display: 'inline-block' }}>
            See how it works
          </a>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 64, fontSize: 13, color: 'rgba(245,234,216,0.65)' }}>
          <span style={{ color: '#d4aa5a', letterSpacing: 2 }}>★★★★★</span>
          <span>1,247 letters sent to the North Pole this season</span>
        </div>

        {/* Letter preview card — full width of content area */}
        <div style={{ background: 'linear-gradient(175deg, #fffef9 0%, #fdf6e3 100%)', borderRadius: 6, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,90,43,0.25)', marginBottom: 48, textAlign: 'left' }}>
          <div style={{ height: 5, background: 'linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F)' }} />
          <div style={{ padding: '40px 60px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(44,21,8,0.38)', marginBottom: 6, fontFamily: 'Georgia, serif' }}>From the desk of Santa Claus · North Pole</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: '#150800', marginBottom: 18 }}>Dear Emma,</div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(139,90,43,0.12)', marginBottom: 20 }} />
            <p style={{ fontSize: 15, lineHeight: 1.9, color: '#2a1508', margin: '0 0 16px', fontFamily: "'Lora', Georgia, serif" }}>
              My elves told me something wonderful — that this year you learned to share your favourite toys with your little brother, even when it was hard. I see everything, you know, and that made my heart as warm as fresh cookies from Mrs. Claus&apos;s oven.
            </p>
            <div style={{ filter: 'blur(5px)', userSelect: 'none', position: 'relative' }}>
              <p style={{ fontSize: 15, lineHeight: 1.9, color: '#2a1508', margin: 0, fontFamily: "'Lora', Georgia, serif" }}>
                Your wish for the art set and the astronomy kit? Well, Mrs. Claus and I had a very long chat about that, and the reindeer have been extra busy this week loading up the sleigh with some very special surprises just for you. I cannot say more — but I think you will be pleased.
              </p>
            </div>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(139,90,43,0.1)' }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: 32, color: '#7B1010' }}>Santa Claus</div>
            </div>
          </div>
          <div style={{ padding: '16px 60px 28px', background: 'rgba(253,246,227,0.95)', borderTop: '1px solid rgba(139,90,43,0.1)', textAlign: 'center' }}>
            <Link href="/create" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #c8382b, #9b1f1f)', color: '#fff', padding: '12px 36px', borderRadius: 3, fontSize: 14, textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '0.06em' }}>
              ✦ Generate your child&apos;s letter →
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div id="how-it-works" style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 8 }}>✦ the magic process ✦</div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#f5ead8', fontWeight: 400, margin: '0 0 32px' }}>Ready in under two minutes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '01', icon: '📝', title: 'Tell Santa about them', desc: 'Name, age, wishes, and a little about their year' },
              { num: '02', icon: '✨', title: 'The elves get to work', desc: 'AI writes a warm, personal letter in seconds' },
              { num: '03', icon: '🎁', title: 'Download or post it', desc: 'Free PDF, premium keepsake, or real mail' },
            ].map(s => (
              <div key={s.num}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 44, color: 'rgba(212,170,90,0.18)', lineHeight: 1, marginBottom: 8 }}>{s.num}</div>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, color: '#f5ead8', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,234,216,0.75)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing strip */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,170,90,0.2)', borderRadius: 8, padding: '28px 40px', marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 20 }}>✦ simple pricing ✦</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { price: 'Free', label: 'Basic letter', sub: 'PDF download' },
              { price: '$9', label: 'Premium PDF', sub: 'Illustrated design' },
              { price: '$29', label: 'Real mail', sub: 'Posted to your door' },
              { price: '$35', label: 'The bundle', sub: 'PDF + physical mail' },
            ].map(p => (
              <div key={p.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#d4aa5a', marginBottom: 4 }}>{p.price}</div>
                <div style={{ fontSize: 12, color: 'rgba(245,234,216,0.85)', marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,234,216,0.65)' }}>{p.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link href="/create" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #c8382b, #9b1f1f)', color: '#fff', padding: '13px 36px', borderRadius: 4, fontSize: 16, textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '0.04em', boxShadow: '0 6px 20px rgba(200,56,43,0.4)' }}>
              ✦ Start for free
            </Link>
            <p style={{ fontSize: 12, color: 'rgba(245,234,216,0.65)', marginTop: 12 }}>No credit card needed · Upgrade anytime</p>
          </div>
        </div>

        {/* Urgency */}
        <div style={{ background: 'rgba(200,56,43,0.1)', border: '1px solid rgba(200,56,43,0.3)', borderRadius: 8, padding: '16px 24px', marginBottom: 40 }}>
          <span style={{ color: '#f09595', fontSize: 13 }}>
            🎄 Order physical letters by <strong style={{ color: '#f5ead8' }}>December 15</strong> for guaranteed Christmas delivery
          </span>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 12, color: 'rgba(245,234,216,0.55)', lineHeight: 1.8 }}>
  SantasLetter.ai · Made with ❤ in Amsterdam · © {new Date().getFullYear()}
  <br />
  <a href="/privacy" style={{ color: 'rgba(245,234,216,0.45)', textDecoration: 'none', marginRight: 16 }}>Privacy Policy</a>
  <a href="/terms" style={{ color: 'rgba(245,234,216,0.45)', textDecoration: 'none' }}>Terms of Service</a>
</div>
      </div>
    </main>
  )
}