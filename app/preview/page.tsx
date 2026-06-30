'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChildInfo } from '@/types'
import { trackEvent } from '@/lib/pixel'

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
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5, speed: Math.random() * 1.0 + 0.3,
      wind: Math.random() * 0.5 - 0.25, opacity: Math.random() * 0.55 + 0.15,
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

function WaxSeal() {
  const blobPath = `M 90,28 C 96,22 108,20 115,26 C 122,32 125,26 130,30 C 138,36 135,44 140,50 C 146,58 152,56 152,65 C 152,74 146,76 148,84 C 150,92 156,96 152,104 C 148,112 140,110 136,116 C 132,122 134,130 126,134 C 118,138 112,132 104,134 C 96,136 94,144 86,144 C 78,144 76,136 68,134 C 60,132 54,138 46,134 C 38,130 40,122 36,116 C 32,110 24,112 20,104 C 16,96 22,92 22,84 C 22,76 16,74 16,65 C 16,56 22,58 28,50 C 34,42 30,34 38,28 C 44,22 52,26 58,22 C 64,18 64,10 72,8 C 80,6 84,16 90,28 Z`
  return (
    <div style={{ textAlign: 'center', margin: '44px 0 20px', userSelect: 'none' }}>
      <svg width="160" height="160" viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="waxBody" cx="36%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#e8452a" /><stop offset="15%" stopColor="#c03020" />
            <stop offset="35%" stopColor="#9a1e18" /><stop offset="60%" stopColor="#761212" />
            <stop offset="80%" stopColor="#550c0c" /><stop offset="100%" stopColor="#350606" />
          </radialGradient>
          <radialGradient id="waxSpecular" cx="30%" cy="26%" r="38%">
            <stop offset="0%" stopColor="rgba(255,210,200,0.7)" /><stop offset="30%" stopColor="rgba(240,140,120,0.3)" />
            <stop offset="70%" stopColor="rgba(200,80,60,0.08)" /><stop offset="100%" stopColor="rgba(180,60,40,0)" />
          </radialGradient>
          <radialGradient id="impressionShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" /><stop offset="55%" stopColor="rgba(80,0,0,0.0)" />
            <stop offset="80%" stopColor="rgba(40,0,0,0.35)" /><stop offset="100%" stopColor="rgba(20,0,0,0.6)" />
          </radialGradient>
          <radialGradient id="edgeDark" cx="50%" cy="48%" r="52%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" /><stop offset="65%" stopColor="rgba(0,0,0,0)" />
            <stop offset="85%" stopColor="rgba(0,0,0,0.2)" /><stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>
          <filter id="deepShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="rgba(50,0,0,0.65)" />
          </filter>
        </defs>
        <g filter="url(#deepShadow)"><path d={blobPath} fill="url(#waxBody)" /></g>
        <path d={blobPath} fill="url(#waxSpecular)" />
        <path d={blobPath} fill="url(#edgeDark)" />
        <circle cx="84" cy="84" r="46" fill="rgba(60,5,5,0.25)" />
        <circle cx="84" cy="84" r="46" fill="url(#impressionShadow)" />
        <circle cx="84" cy="84" r="44" fill="none" stroke="rgba(255,190,170,0.2)" strokeWidth="1.2" />
        <circle cx="84" cy="84" r="40" fill="none" stroke="rgba(255,175,155,0.14)" strokeWidth="0.8" />
        <path id="inscriptionRing" d="M 84,84 m -41,0 a 41,41 0 1,1 82,0 a 41,41 0 1,1 -82,0" fill="none" />
        <text fontSize="6" letterSpacing="3" fill="rgba(255,215,200,0.7)" fontFamily="Georgia, serif">
          <textPath href="#inscriptionRing" startOffset="2%">NORTH POLE POST OFFICE  ✦  SANTA CLAUS  ✦  EST. CCLXXX A.D.  ✦</textPath>
        </text>
        <text x="86" y="96" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="52" fontWeight="bold" fill="rgba(30,0,0,0.7)">S</text>
        <text x="84" y="94" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="52" fontWeight="bold" fill="rgba(200,100,80,0.5)">S</text>
        <text x="83" y="93" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="52" fontWeight="bold" fill="rgba(255,228,215,0.95)">S</text>
      </svg>
      <div style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(139,90,43,0.45)', textTransform: 'uppercase', marginTop: 4, fontFamily: 'Georgia, serif' }}>
        Official North Pole Post Office · Authenticated Seal
      </div>
    </div>
  )
}

function LetterHeader() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 24 }}>
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(139,90,43,0.7) 30%, rgba(180,130,60,0.9) 50%, rgba(139,90,43,0.7) 70%, transparent)', marginBottom: 3 }} />
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,90,43,0.35) 30%, rgba(160,110,50,0.5) 50%, rgba(139,90,43,0.35) 70%, transparent)', marginBottom: 16 }} />
      <div style={{ marginBottom: 10 }}>
        <svg width="48" height="48" viewBox="0 0 60 60">
          <defs>
            <radialGradient id="starGrad2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(180,130,60,0.9)" />
              <stop offset="100%" stopColor="rgba(139,90,43,0.5)" />
            </radialGradient>
          </defs>
          <path d={Array.from({ length: 8 }, (_, i) => {
            const a1 = (i / 8) * Math.PI * 2 - Math.PI / 2
            const a2 = ((i + 0.5) / 8) * Math.PI * 2 - Math.PI / 2
            const x1 = 30 + 28 * Math.cos(a1), y1 = 30 + 28 * Math.sin(a1)
            const x2 = 30 + 12 * Math.cos(a2), y2 = 30 + 12 * Math.sin(a2)
            return (i === 0 ? `M${x1.toFixed(1)},${y1.toFixed(1)}` : `L${x1.toFixed(1)},${y1.toFixed(1)}`) + ` L${x2.toFixed(1)},${y2.toFixed(1)}`
          }).join(' ') + 'Z'} fill="url(#starGrad2)" />
          <circle cx="30" cy="30" r="8" fill="rgba(253,246,227,0.9)" />
          <text x="30" y="34" textAnchor="middle" fontSize="10" fontFamily="Georgia" fill="rgba(139,90,43,0.8)">❄</text>
        </svg>
      </div>
      <div style={{ fontSize: 9, letterSpacing: '0.35em', color: 'rgba(139,90,43,0.55)', textTransform: 'uppercase', fontFamily: 'Georgia, serif', marginBottom: 8 }}>The Official</div>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <div style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 'clamp(14px, 4vw, 24px)', letterSpacing: 'clamp(0.05em, 1vw, 0.2em)', color: 'rgba(80,38,10,0.88)', textTransform: 'uppercase', fontWeight: 400, whiteSpace: 'nowrap', padding: '6px 0' }}>
          North Pole Post Office
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <svg width="100%" height="52" viewBox="0 0 380 52" preserveAspectRatio="none">
            <ellipse cx="190" cy="26" rx="188" ry="24" fill="none" stroke="rgba(139,90,43,0.18)" strokeWidth="1.2" />
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,90,43,0.4))' }} />
        <div style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(120,70,25,0.5)', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>Est. Anno Domini CCLXXX</div>
        <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, rgba(139,90,43,0.4), transparent)' }} />
      </div>
      <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 11, color: 'rgba(139,90,43,0.42)', marginBottom: 18, letterSpacing: '0.04em' }}>
        Correspondence guaranteed to reach every good child
      </div>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,90,43,0.35) 30%, rgba(160,110,50,0.5) 50%, rgba(139,90,43,0.35) 70%, transparent)', marginBottom: 3 }} />
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(139,90,43,0.7) 30%, rgba(180,130,60,0.9) 50%, rgba(139,90,43,0.7) 70%, transparent)' }} />
    </div>
  )
}

const TIER_MAP: Record<string, string> = {
  'Premium PDF': 'premium',
  'The bundle': 'bundle',
  'Real mail': 'physical',
  'Add a child': 'addChild',
}

const EARLIEST_MAIL_DATE = '2026-11-22'

// CHANGE 2: Animated loading state. The wait now has motion (a writing quill
// with a glowing nib and a drifting underline) so 8-13 seconds reads as alive,
// not frozen. Respects prefers-reduced-motion via the media query in the
// injected <style> tag below.
function GeneratingState({ name, genError, onRetry }: { name: string; genError: boolean; onRetry: () => void }) {
  const messages = [
    'Settling into his favourite chair by the fire',
    `Reading what this year has held for ${name}`,
    'Dipping the quill in North Pole ink',
    'Choosing the words with care',
    'Pressing the wax seal',
  ]
  const [msgIndex, setMsgIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setMsgIndex(i => (i + 1) % messages.length), 2600)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  return (
    <div style={{ textAlign: 'center', padding: '56px 24px' }}>
      <style>{`
        @keyframes sl-quill-bob {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50% { transform: translateY(-6px) rotate(-4deg); }
        }
        @keyframes sl-nib-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @keyframes sl-ink-draw {
          0% { stroke-dashoffset: 280; }
          70% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes sl-spark {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes sl-fade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sl-quill { animation: sl-quill-bob 2.4s ease-in-out infinite; transform-origin: bottom center; }
        .sl-nib { animation: sl-nib-glow 1.6s ease-in-out infinite; }
        .sl-ink { stroke-dasharray: 280; animation: sl-ink-draw 5.2s ease-in-out infinite; }
        .sl-spark { animation: sl-spark 2s ease-in-out infinite; }
        .sl-msg { animation: sl-fade 0.5s ease; }
        @media (prefers-reduced-motion: reduce) {
          .sl-quill, .sl-nib, .sl-ink, .sl-spark { animation: none !important; }
          .sl-nib { opacity: 0.9; }
          .sl-ink { stroke-dashoffset: 0; }
        }
      `}</style>

      <div style={{ position: 'relative', width: 180, height: 150, margin: '0 auto 28px' }}>
        {/* parchment + quill scene */}
        <svg width="180" height="150" viewBox="0 0 180 150" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="slPaper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fffef5" />
              <stop offset="100%" stopColor="#f3e6c4" />
            </linearGradient>
          </defs>
          {/* parchment */}
          <rect x="34" y="38" width="112" height="96" rx="3" fill="url(#slPaper)" stroke="rgba(139,90,43,0.35)" strokeWidth="1.2" />
          {/* ink line being drawn */}
          <path className="sl-ink" d="M 48,66 Q 70,60 92,66 T 134,66 M 48,86 Q 66,81 84,86 T 120,86 M 48,106 Q 64,102 80,106" fill="none" stroke="rgba(109,14,14,0.55)" strokeWidth="2" strokeLinecap="round" />
          {/* sparkles */}
          <circle className="sl-spark" cx="40" cy="30" r="2.4" fill="#d4aa5a" style={{ transformOrigin: '40px 30px' }} />
          <circle className="sl-spark" cx="150" cy="46" r="2" fill="#d4aa5a" style={{ transformOrigin: '150px 46px', animationDelay: '0.6s' }} />
          <circle className="sl-spark" cx="146" cy="118" r="2.2" fill="#d4aa5a" style={{ transformOrigin: '146px 118px', animationDelay: '1.1s' }} />
          {/* quill */}
          <g className="sl-quill">
            <path d="M 150,18 C 132,40 118,72 112,104 L 120,108 C 130,78 144,48 158,26 Z" fill="#f5ead8" stroke="rgba(139,90,43,0.5)" strokeWidth="1" />
            <path d="M 150,18 C 138,42 126,72 116,104" fill="none" stroke="rgba(139,90,43,0.3)" strokeWidth="0.8" />
            {/* nib tip glow */}
            <circle className="sl-nib" cx="113" cy="106" r="3.6" fill="#d4aa5a" />
          </g>
        </svg>
      </div>

      <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 14 }}>
        ✦ the north pole post office ✦
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(22px, 5vw, 30px)', color: '#f5ead8', fontWeight: 400, margin: '0 0 18px', lineHeight: 1.3 }}>
        Santa is writing {name}&apos;s letter
      </h1>
      <p key={msgIndex} className="sl-msg" style={{ color: 'rgba(245,234,216,0.6)', fontSize: 15, margin: '0 0 8px', fontStyle: 'italic', minHeight: 24 }}>
        {messages[msgIndex]}…
      </p>
      <p style={{ color: 'rgba(245,234,216,0.3)', fontSize: 12, margin: '0 0 44px' }}>
        This takes a few seconds. Please keep this window open.
      </p>

      {genError && (
        <div>
          <p style={{ color: '#f09595', marginBottom: 16 }}>Something went wrong. The elves are ready to try again.</p>
          <button onClick={onRetry} style={{ background: '#c8382b', color: '#fff', border: 'none', padding: '11px 30px', borderRadius: 3, cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: 14 }}>Try again</button>
        </div>
      )}
    </div>
  )
}

function DeliveryDateModal({
  tier,
  onConfirm,
  onCancel,
}: {
  tier: string
  onConfirm: (date: string) => void
  onCancel: () => void
}) {
  const minDate = EARLIEST_MAIL_DATE
  const maxDate = '2026-12-22'

  const presets = [
    { id: 'early', label: 'Early December', sub: 'Arrives Dec 1–7', sendDate: '2026-11-22' },
    { id: 'mid', label: 'Mid-December', sub: 'Arrives Dec 8–15', sendDate: '2026-11-30' },
    { id: 'late', label: 'Late December', sub: 'Arrives Dec 16–22', sendDate: '2026-12-08' },
  ]

  const [selectedPreset, setSelectedPreset] = useState<string>('early')
  const [customDate, setCustomDate] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(4,8,20,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'radial-gradient(ellipse at top, #0d1f3c 0%, #060e1c 100%)',
        border: '1px solid rgba(212,170,90,0.4)',
        borderRadius: 16,
        padding: '40px 36px',
        maxWidth: 460,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
        <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 12 }}>
          ✦ when should it arrive? ✦
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: '#f5ead8', fontWeight: 400, margin: '0 0 10px', lineHeight: 1.3 }}>
          Choose your delivery window
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(245,234,216,0.55)', margin: '0 0 28px', lineHeight: 1.7, fontStyle: 'italic' }}>
          Letters are hand-stamped and mailed in late November so they arrive in December — when Christmas magic feels closest.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18, textAlign: 'left' }}>
          {presets.map(preset => {
            const isSelected = !useCustom && selectedPreset === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => { setSelectedPreset(preset.id); setUseCustom(false) }}
                style={{
                  padding: '14px 18px',
                  background: isSelected ? 'rgba(212,170,90,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? 'rgba(212,170,90,0.6)' : 'rgba(245,234,216,0.12)'}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                }}>
                <div style={{ fontSize: 13, color: '#f5ead8', fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 2 }}>
                  {preset.label}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(245,234,216,0.5)' }}>
                  {preset.sub}
                </div>
              </button>
            )
          })}

          <button
            onClick={() => setUseCustom(true)}
            style={{
              padding: '14px 18px',
              background: useCustom ? 'rgba(212,170,90,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${useCustom ? 'rgba(212,170,90,0.6)' : 'rgba(245,234,216,0.12)'}`,
              borderRadius: 8, cursor: 'pointer', textAlign: 'left',
            }}>
            <div style={{ fontSize: 13, color: '#f5ead8', fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 2 }}>
              Pick a specific date
            </div>
            <div style={{ fontSize: 11, color: 'rgba(245,234,216,0.5)' }}>
              Choose any post date between Nov 22 and Dec 22
            </div>
          </button>
        </div>

        {useCustom && (
          <div style={{ marginBottom: 18 }}>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={customDate || minDate}
              onChange={e => setCustomDate(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(245,234,216,0.2)',
                borderRadius: 6, color: '#f5ead8',
                fontFamily: 'Georgia, serif', fontSize: 15,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: 'rgba(245,234,216,0.35)', marginTop: 6, textAlign: 'left' }}>
              Letters arrive 5–10 business days after the post date.
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (useCustom) {
              onConfirm(customDate || minDate)
            } else {
              const preset = presets.find(p => p.id === selectedPreset)
              onConfirm(preset?.sendDate || minDate)
            }
          }}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #c8382b 0%, #9b1f1f 100%)',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 15, letterSpacing: '0.04em',
            boxShadow: '0 6px 20px rgba(200,56,43,0.4)',
            marginBottom: 10,
          }}>
          ✦ Confirm &amp; proceed to payment
        </button>

        <button
          onClick={onCancel}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(245,234,216,0.25)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'Georgia, serif',
          }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function PreviewPage() {
  const router = useRouter()
  const [child, setChild] = useState<ChildInfo | null>(null)
  const [letter, setLetter] = useState('')
  const [letterId, setLetterId] = useState('')
  // CHANGE 2: only two steps now. The email-gate step is gone because the
  // email is captured on the form and passed into the single generate call.
  const [step, setStep] = useState<'generating' | 'done'>('generating')
  const [email, setEmail] = useState('')
  const [genError, setGenError] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [pendingTier, setPendingTier] = useState<string | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true
    const stored = sessionStorage.getItem('santaChildInfo')
    if (!stored) { router.push('/create'); return }
    const childData = JSON.parse(stored) as ChildInfo
    setChild(childData)
    // CHANGE 1/2: email now comes from the form via sessionStorage.
    // Fall back to recipientEmail on the child object for safety.
    const storedEmail = sessionStorage.getItem('santaEmail') || childData.recipientEmail || ''
    setEmail(storedEmail)

    const cachedLetter = sessionStorage.getItem('santaLetterText')
    const cachedLetterId = sessionStorage.getItem('santaLetterId')
    if (cachedLetter && cachedLetterId) {
      setLetter(cachedLetter)
      setLetterId(cachedLetterId)
      setStep('done')
    } else {
      generateLetter(childData, storedEmail)
    }
  }, [])

  // CHANGE 2: generate ONCE, with the email included, so the letter is
  // stored and emailed in the same call. No second /api/generate request,
  // no blurred gate. The email is banked the moment generation fires; if the
  // user bails during the wait, /api/generate has already captured it.
  async function generateLetter(childData: ChildInfo, recipientEmail: string) {
    setGenError(false)
    try {
      const language = sessionStorage.getItem('santaLanguage') || 'en'
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child: childData, language, email: recipientEmail || undefined }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLetter(data.letter)
      sessionStorage.setItem('santaLetterText', data.letter)
      if (data.letterId) {
        setLetterId(data.letterId)
        sessionStorage.setItem('santaLetterId', data.letterId)
      }
      // Lead fires on successful completion now, since email was captured up front.
      trackEvent('Lead', { content_name: 'free_letter_completed' })
      setStep('done')
    } catch { setGenError(true) }
  }

  const handleCheckoutClick = (tier: string) => {
    const needsShipping = tier === 'physical' || tier === 'bundle'
    if (needsShipping) {
      setPendingTier(tier)
      setShowDateModal(true)
    } else {
      proceedToCheckout(tier, undefined)
    }
  }

  const proceedToCheckout = async (tier: string, deliveryDate: string | undefined) => {
    if (!child) return
    setCheckoutLoading(tier)
    setShowDateModal(false)
    const discount = sessionStorage.getItem('earlybird') === 'true'
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          letterId: letterId || sessionStorage.getItem('santaLetterId') || 'unknown',
          childName: child.name,
          recipientEmail: email,
          discount,
          deliveryDate,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error('No checkout URL returned')
    } catch (err) {
      console.error('Checkout failed:', err)
      setCheckoutLoading(null)
    }
  }

  const paragraphs = letter.split('\n\n').filter(p => p.trim()).map((p, i) => {
    const clean = p.replace(/\*/g, '').trim()
    return (
      <p key={i} style={{ margin: '0 0 20px', lineHeight: 1.8, color: '#150800', fontSize: 'clamp(14px, 3.5vw, 16px)', fontFamily: "'Lora', Georgia, serif" }}>{clean}</p>
    )
  })

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0d1f3c 0%, #060e1c 60%)', fontFamily: "'Lora', Georgia, serif", position: 'relative', overflow: 'hidden' }}>

      {showDateModal && pendingTier && (
        <DeliveryDateModal
          tier={pendingTier}
          onConfirm={(date) => {
            proceedToCheckout(pendingTier, date)
            setPendingTier(null)
          }}
          onCancel={() => {
            setShowDateModal(false)
            setPendingTier(null)
          }}
        />
      )}

      <Snowflakes />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(200,56,43,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1, background: '#fff', borderRadius: '50%', opacity: 0.1 + (i % 6) * 0.05, top: `${(Math.sin(i * 1.7) * 45 + 50)}%`, left: `${(i * 6.3) % 100}%` }} />
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(24px, 5vw, 44px) clamp(16px, 4vw, 40px) 100px', position: 'relative', zIndex: 10 }}>

        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(18px, 4vw, 26px)', color: '#d4aa5a', letterSpacing: '0.05em' }}>
              SantasLetter<span style={{ color: 'rgba(245,234,216,0.6)' }}>.ai</span>
            </span>
          </a>
        </div>

        {step === 'generating' && (
          <GeneratingState
            name={child?.name || 'your child'}
            genError={genError}
            onRetry={() => child && generateLetter(child, email)}
          />
        )}

        {step === 'done' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 12 }}>✦ your letter from santa ✦</div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(20px, 5vw, 30px)', color: '#f5ead8', fontWeight: 400, margin: 0, lineHeight: 1.3 }}>
                A message from the North Pole,<br />just for {child?.name}
              </h1>
            </div>

            <div style={{ position: 'relative', background: 'linear-gradient(170deg, #fffef5 0%, #fdf8e8 35%, #faf2d5 70%, #f7ecc0 100%)', borderRadius: 2, boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,90,43,0.4)', marginBottom: 36, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139,90,43,0.022) 31px, rgba(139,90,43,0.022) 32px)', pointerEvents: 'none', zIndex: 0 }} />
              <div style={{ height: 7, background: 'linear-gradient(90deg, #5a0a0a, #9b1f1f 20%, #c8382b 40%, #d4aa5a 50%, #c8382b 60%, #9b1f1f 80%, #5a0a0a)', position: 'relative', zIndex: 2 }} />
              <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(212,170,90,0.4) 30%, rgba(212,170,90,0.6) 50%, rgba(212,170,90,0.4) 70%, transparent)', position: 'relative', zIndex: 2 }} />
              <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, border: '1px solid rgba(139,90,43,0.2)', pointerEvents: 'none', zIndex: 1 }} />
              {[{ top: 26, left: 26 }, { top: 26, right: 26 }, { bottom: 26, left: 26 }, { bottom: 26, right: 26 }].map((pos, i) => (
                <div key={i} style={{ position: 'absolute', ...pos, fontSize: 13, color: 'rgba(139,90,43,0.3)', zIndex: 2, userSelect: 'none', lineHeight: 1 }}>✦</div>
              ))}
              <div style={{ padding: 'clamp(24px, 5vw, 44px) clamp(20px, 6vw, 80px) clamp(32px, 5vw, 60px)', position: 'relative', zIndex: 2 }}>
                <LetterHeader />
                <div style={{ textAlign: 'right', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 13, color: 'rgba(100,55,20,0.48)', marginBottom: 28, letterSpacing: '0.02em' }}>{today}</div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(22px, 5vw, 30px)', color: '#0f0500', marginBottom: 24, lineHeight: 1.2 }}>Dear {child?.name},</div>
                <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(139,90,43,0.45), rgba(139,90,43,0.15) 70%, transparent)', marginBottom: 24 }} />
                <div>{paragraphs}</div>
                <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(139,90,43,0.14)' }}>
                  <div style={{ fontSize: 14, color: 'rgba(60,28,8,0.45)', marginBottom: 4, fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>With all the love and magic of Christmas,</div>
                  <div style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontStyle: 'italic', fontSize: 'clamp(48px, 10vw, 72px)', color: '#6d0e0e', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '2px 4px 0 rgba(80,10,10,0.14)', transform: 'rotate(-1.5deg)', display: 'inline-block', transformOrigin: 'left center' }}>Santa Claus</div>
                  <div style={{ marginTop: 6, marginBottom: 12 }}>
                    <svg width="220" height="12" viewBox="0 0 280 12">
                      <path d="M 5,8 Q 50,3 100,7 Q 150,11 200,6 Q 240,2 275,8" fill="none" stroke="rgba(109,14,14,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(44,21,8,0.3)', marginBottom: 2 }}>Kris Kringle · Father Christmas · St. Nicholas</div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(44,21,8,0.22)', fontStyle: 'italic', marginBottom: 6 }}>Chief Correspondent, North Pole Post Office</div>
                  <div style={{ display: 'inline-block', border: '1px solid rgba(139,90,43,0.3)', padding: '4px 12px', marginTop: 6 }}>
                    <div style={{ fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(100,55,20,0.45)', fontFamily: 'Georgia, serif' }}>Postmarked · North Pole · {new Date().getFullYear()}</div>
                  </div>
                </div>
                <WaxSeal />
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 0.8, background: 'linear-gradient(90deg, transparent, rgba(139,90,43,0.3) 50%, transparent)' }} />
                    <span style={{ fontSize: 10, color: 'rgba(139,90,43,0.35)', letterSpacing: 4 }}>❄ ✦ ❄</span>
                    <div style={{ flex: 1, height: 0.8, background: 'linear-gradient(90deg, transparent, rgba(139,90,43,0.3) 50%, transparent)' }} />
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 10, letterSpacing: '0.08em', color: 'rgba(139,90,43,0.3)' }}>
                    Delivered with love from the North Pole · Christmas Eve Guaranteed
                  </div>
                </div>
              </div>
              <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(212,170,90,0.4) 30%, rgba(212,170,90,0.6) 50%, rgba(212,170,90,0.4) 70%, transparent)' }} />
              <div style={{ height: 7, background: 'linear-gradient(90deg, #5a0a0a, #9b1f1f 20%, #c8382b 40%, #d4aa5a 50%, #c8382b 60%, #9b1f1f 80%, #5a0a0a)' }} />
            </div>

            <div style={{ background: 'linear-gradient(160deg, #0e1c35 0%, #080f20 100%)', border: '1px solid rgba(212,170,90,0.3)', borderRadius: 12, padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 36px)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 10 }}>✦ make it extra magical ✦</div>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(20px, 4vw, 26px)', color: '#f5ead8', fontWeight: 400, margin: '0 0 8px', lineHeight: 1.3 }}>
                  Give {child?.name} a keepsake they&apos;ll treasure forever
                </h2>
                <p style={{ color: 'rgba(245,234,216,0.38)', fontSize: 13, margin: 0, fontStyle: 'italic' }}>
                  A beautiful PDF to print, or a real letter arriving by post
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 18 }}>
                {[
                  { label: 'Premium PDF', price: '$9', emoji: '📄', desc: 'Illustrated parchment design, print-ready at home', highlight: false, cta: 'Select' },
                  { label: 'The bundle', price: '$35', emoji: '🎁', desc: 'Premium PDF (instant) + posted letter for December', highlight: true, cta: '✦ Get the bundle' },
                  { label: 'Real mail', price: '$29', emoji: '✉️', desc: 'Hand-stamped & posted, arriving in December', highlight: false, cta: 'Select' },
                  { label: 'Add a child', price: '+$15', emoji: '⭐', desc: 'Another child gets their own magical letter', highlight: false, cta: 'Select' },
                ].map(opt => {
                  const tier = TIER_MAP[opt.label]
                  const isLoading = checkoutLoading === tier
                  return (
                    <div key={opt.label} style={{ border: `1px solid ${opt.highlight ? 'rgba(212,170,90,0.6)' : 'rgba(245,234,216,0.09)'}`, borderRadius: 10, padding: '24px 20px', background: opt.highlight ? 'linear-gradient(145deg, rgba(212,170,90,0.1) 0%, rgba(180,130,50,0.05) 100%)' : 'rgba(255,255,255,0.025)', position: 'relative' }}>
                      {opt.highlight && (
                        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #d4aa5a, #a8802a)', color: '#0d1b2e', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '5px 16px', borderRadius: 20, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(212,170,90,0.4)' }}>
                          Most popular
                        </div>
                      )}
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.emoji}</div>
                      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: opt.highlight ? '#d4aa5a' : '#f5ead8', marginBottom: 3, lineHeight: 1 }}>{opt.price}</div>
                      <div style={{ fontSize: 13, color: opt.highlight ? 'rgba(245,234,216,0.9)' : 'rgba(245,234,216,0.7)', marginBottom: 6, fontWeight: 500 }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(245,234,216,0.4)', marginBottom: 16, lineHeight: 1.55 }}>{opt.desc}</div>
                      <button
                        onClick={() => handleCheckoutClick(tier)}
                        disabled={checkoutLoading !== null}
                        style={{ width: '100%', padding: '11px', background: opt.highlight ? 'linear-gradient(135deg, #c8382b 0%, #8B1A1A 100%)' : 'rgba(255,255,255,0.06)', color: opt.highlight ? '#fff' : 'rgba(245,234,216,0.6)', border: opt.highlight ? 'none' : '1px solid rgba(245,234,216,0.14)', borderRadius: 6, cursor: checkoutLoading ? 'wait' : 'pointer', fontFamily: opt.highlight ? "'Playfair Display', Georgia, serif" : 'Georgia, serif', fontSize: opt.highlight ? 14 : 13, boxShadow: opt.highlight ? '0 6px 20px rgba(200,56,43,0.4)' : 'none', opacity: checkoutLoading && !isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                        {isLoading ? '✦ Loading...' : opt.cta}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div style={{ textAlign: 'center', padding: '12px 0 6px', fontSize: 13, color: 'rgba(245,234,216,0.5)', marginBottom: 8 }}>
                ✓ Your free letter has been sent to {email}
              </div>
              <div style={{ background: 'rgba(212,170,90,0.08)', border: '1px solid rgba(212,170,90,0.25)', borderRadius: 8, padding: '14px 20px', textAlign: 'center', marginBottom: 14 }}>
                <span style={{ color: '#d4aa5a', fontSize: 12, letterSpacing: '0.04em' }}>
                  📬 Physical letters are hand-stamped and mailed in late November · <strong style={{ color: '#f5ead8' }}>Arriving in December</strong>
                </span>
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(245,234,216,0.18)', margin: 0, lineHeight: 1.7 }}>
                Free copy noted for {email} · All payments secured by Stripe
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}