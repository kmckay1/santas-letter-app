'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

function Snowflakes() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const flakes = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5, speed: Math.random() * 0.8 + 0.2,
      wind: Math.random() * 0.4 - 0.2, opacity: Math.random() * 0.5 + 0.1,
      wobble: Math.random() * Math.PI * 2, wobbleSpeed: Math.random() * 0.02 + 0.005,
    }))
    let animId: number
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      flakes.forEach(f => {
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210, 235, 255, ${f.opacity})`; ctx.fill()
        f.y += f.speed; f.wobble += f.wobbleSpeed
        f.x += f.wind + Math.sin(f.wobble) * 0.3
        if (f.y > canvas.height + 5) { f.y = -5; f.x = Math.random() * canvas.width }
        if (f.x > canvas.width) f.x = 0; if (f.x < 0) f.x = canvas.width
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

export default function SuccessPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0d1f3c 0%, #060e1c 60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Lora', Georgia, serif", color: '#f5ead8', textAlign: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <Snowflakes />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F)', zIndex: 200 }} />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 560 }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 48 }}>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#d4aa5a', letterSpacing: '0.04em' }}>
            SantasLetter<span style={{ color: 'rgba(245,234,216,0.6)' }}>.ai</span>
          </span>
        </a>

        {/* Success card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,170,90,0.25)', borderRadius: 12, padding: '48px 40px', marginBottom: 32 }}>

          <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 8px 24px rgba(212,170,90,0.4))' }}>🎁</div>

          <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 16 }}>
            ✦ order confirmed ✦
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(24px, 5vw, 32px)', color: '#f5ead8', fontWeight: 400, margin: '0 0 16px', lineHeight: 1.25 }}>
            The elves are on it!
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(245,234,216,0.65)', margin: '0 0 32px', lineHeight: 1.75, fontStyle: 'italic' }}>
            Your order has been confirmed and a receipt has been sent to your email. Check your inbox for the details.
          </p>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(212,170,90,0.2)' }} />
            <span style={{ color: 'rgba(212,170,90,0.4)', fontSize: 12 }}>✦</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(212,170,90,0.2)' }} />
          </div>

          {/* What happens next */}
          <div style={{ textAlign: 'left', marginBottom: 32 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,170,90,0.6)', marginBottom: 16 }}>What happens next</div>
            {[
              { icon: '📧', text: 'Your PDF will arrive by email within a few minutes' },
              { icon: '📬', text: 'Physical letters are printed and posted within 1–2 business days' },
              { icon: '🎄', text: 'Delivery guaranteed before Christmas Eve' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <span style={{ fontSize: 20, lineHeight: 1.4 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'rgba(245,234,216,0.65)', lineHeight: 1.65 }}>{item.text}</span>
              </div>
            ))}
          </div>

          <Link href="/create" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #c8382b, #9b1f1f)', color: '#fff', padding: '13px 32px', borderRadius: 4, fontSize: 15, textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '0.04em', boxShadow: '0 6px 20px rgba(200,56,43,0.4)' }}>
            ✦ Write another letter
          </Link>
        </div>

        <div style={{ fontSize: 12, color: 'rgba(245,234,216,0.3)', lineHeight: 1.8 }}>
          Questions? Email us at <a href="mailto:santa@santasletter.ai" style={{ color: 'rgba(212,170,90,0.5)', textDecoration: 'none' }}>santa@santasletter.ai</a>
        </div>
      </div>
    </main>
  )
}