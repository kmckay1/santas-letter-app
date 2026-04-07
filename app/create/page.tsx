'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChildInfo } from '@/types'

function Snowflakes() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const flakes = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5, speed: Math.random() * 1.0 + 0.3,
      wind: Math.random() * 0.5 - 0.25, opacity: Math.random() * 0.5 + 0.15,
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
        f.x += f.wind + Math.sin(f.wobble) * 0.4
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

const BEHAVIOR_LABELS: Record<number, string> = {
  1: 'Very naughty 😈', 2: 'Mostly naughty 😬', 3: 'More naughty than nice 😅',
  4: 'A little naughty 🙈', 5: 'Right in the middle 😐', 6: 'Mostly nice 🙂',
  7: 'Pretty good! 😊', 8: 'Very nice ⭐', 9: 'Wonderfully nice 🌟', 10: 'Perfectly nice 🎅',
}

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'nl', label: '🇳🇱 Nederlands' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'pl', label: '🇵🇱 Polski' },
  { code: 'sv', label: '🇸🇪 Svenska' },
  { code: 'da', label: '🇩🇰 Dansk' },
  { code: 'no', label: '🇳🇴 Norsk' },
  { code: 'fi', label: '🇫🇮 Suomi' },
]

export default function CreatePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', age: '', behaviorRating: 8,
    behaviorNotes: '', wishes: ['', '', ''], parentNotes: '',
  })
  const [language, setLanguage] = useState('en')
  const [error, setError] = useState('')

  useEffect(() => {
    sessionStorage.removeItem('santaChildInfo')
    const browserLang = navigator.language.split('-')[0]
    if (LANGUAGES.find(l => l.code === browserLang)) {
      setLanguage(browserLang)
    }
  }, [])

  const updateWish = (index: number, value: string) => {
    const updated = [...form.wishes]
    updated[index] = value
    setForm({ ...form, wishes: updated })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sessionStorage.removeItem('santaChildInfo')
    if (!form.name.trim()) return setError('Please enter your child\'s name')
    if (!form.age) return setError('Please enter your child\'s age')
    const ageNum = Number(form.age)
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 16) return setError('Please enter a valid age between 1 and 16')
    if (form.wishes.every(w => !w.trim())) return setError('Please add at least one wish')
    const childData: ChildInfo = { ...form, recipientEmail: '' }
    sessionStorage.setItem('santaChildInfo', JSON.stringify(childData))
    sessionStorage.setItem('santaLanguage', language)
    router.push('/preview')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(245,234,216,0.2)',
    borderRadius: 4, color: '#f5ead8',
    fontFamily: "'Lora', Georgia, serif", fontSize: 15,
    boxSizing: 'border-box', outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'rgba(245,234,216,0.8)', marginBottom: 10,
  }

  const hintStyle: React.CSSProperties = {
    display: 'block', fontSize: 12,
    color: 'rgba(245,234,216,0.6)',
    fontStyle: 'italic', marginBottom: 10,
  }

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0d1f3c 0%, #060e1c 60%)', padding: '0 16px 80px', fontFamily: "'Lora', Georgia, serif", position: 'relative', overflow: 'hidden' }}>
      <Snowflakes />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F)', zIndex: 200 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1, background: '#fff', borderRadius: '50%', opacity: 0.08 + (i % 6) * 0.05, top: `${(Math.sin(i * 1.7) * 45 + 50)}%`, left: `${(i * 6.1) % 100}%` }} />
        ))}
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '48px 0 36px' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#d4aa5a', letterSpacing: '0.04em' }}>
              SantasLetter<span style={{ color: 'rgba(245,234,216,0.7)' }}>.ai</span>
            </span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,170,90,0.5))' }} />
            <span style={{ color: '#d4aa5a', fontSize: 16 }}>❄</span>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, rgba(212,170,90,0.5), transparent)' }} />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#f5ead8', fontWeight: 400, margin: '0 0 10px', lineHeight: 1.2 }}>
            Tell Santa about your child
          </h1>
          <p style={{ color: 'rgba(245,234,216,0.7)', fontSize: 15, margin: 0, fontStyle: 'italic' }}>
            Takes 2 minutes · Letter ready instantly ✨
          </p>
        </div>

        {/* Form card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,170,90,0.2)', borderRadius: 10, padding: '36px 36px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 28, color: 'rgba(212,170,90,0.08)', pointerEvents: 'none', userSelect: 'none' }}>❄</div>
          <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 22, color: 'rgba(212,170,90,0.06)', pointerEvents: 'none', userSelect: 'none' }}>✦</div>

          <form onSubmit={handleSubmit}>

            {/* Language selector */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Letter language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Name + Age */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Child&apos;s name</label>
                <input
                  type="text"
                  placeholder="Emma"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                  maxLength={50}
                />
              </div>
              <div>
                <label style={labelStyle}>Age</label>
                <input
                  type="number"
                  placeholder="7"
                  min="1"
                  max="16"
                  value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Behavior slider */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Behavior this year</label>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,234,216,0.15)', borderRadius: 4, padding: '16px 18px' }}>
                <div style={{ textAlign: 'center', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, color: '#d4aa5a', marginBottom: 12 }}>
                  {BEHAVIOR_LABELS[form.behaviorRating]}
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={form.behaviorRating}
                  onChange={e => setForm({ ...form, behaviorRating: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    accentColor: '#d4aa5a',
                    cursor: 'pointer',
                    height: '36px',
                    touchAction: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(245,234,216,0.55)' }}>NAUGHTY</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(245,234,216,0.55)' }}>NICE</span>
                </div>
              </div>
            </div>

            {/* Behavior notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>What has Santa noticed this year?</label>
              <span style={hintStyle}>Optional — specific details make the letter magical</span>
              <textarea
                placeholder="She helped her little brother with homework, started swimming lessons…"
                value={form.behaviorNotes}
                onChange={e => setForm({ ...form, behaviorNotes: e.target.value })}
                style={{ ...inputStyle, height: 90, resize: 'vertical' }}
                maxLength={500}
              />
            </div>

            {/* Wishes */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Christmas wishes (up to 3)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.wishes.map((wish, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{['🎁', '⭐', '✨'][i]}</span>
                    <input
                      type="text"
                      placeholder={['e.g. An art set', 'e.g. A telescope', 'e.g. A new bike'][i]}
                      value={wish}
                      onChange={e => updateWish(i, e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                      maxLength={100}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Secret note */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>🤫 Secret note to Santa</label>
              <span style={hintStyle}>Optional — your child will never see this</span>
              <textarea
                placeholder="She's been going through a tough time at school and could use some encouragement…"
                value={form.parentNotes}
                onChange={e => setForm({ ...form, parentNotes: e.target.value })}
                style={{ ...inputStyle, height: 76, resize: 'vertical' }}
                maxLength={300}
              />
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(212,170,90,0.2)' }} />
              <span style={{ color: 'rgba(212,170,90,0.5)', fontSize: 12 }}>✦</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(212,170,90,0.2)' }} />
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.25)', borderRadius: 4, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ color: '#f09595', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #c8382b 0%, #9b1f1f 100%)', color: '#fff', border: 'none', borderRadius: 5, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, cursor: 'pointer', letterSpacing: '0.04em', boxShadow: '0 6px 24px rgba(200,56,43,0.45)' }}>
              ✦ Write my child&apos;s letter
            </button>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'rgba(245,234,216,0.65)', lineHeight: 1.7 }}>
              Free to generate · No credit card needed · Takes ~5 seconds
            </p>
          </form>
        </div>

        {/* Bottom ornament */}
        <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,170,90,0.25))' }} />
          <span style={{ color: 'rgba(212,170,90,0.4)', fontSize: 18 }}>❄</span>
          <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, rgba(212,170,90,0.25), transparent)' }} />
        </div>
      </div>
    </main>
  )
}