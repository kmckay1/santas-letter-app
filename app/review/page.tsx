'use client'

import { useState } from 'react'

export default function ReviewPage() {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [name, setName] = useState('')
  const [childName, setChildName] = useState('')
  const [review, setReview] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    setStatus('loading')
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, name, childName, review }),
      })
      if (res.ok) setStatus('done')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#fdf6e3', fontFamily: 'Georgia, serif', color: '#2c1a0e', padding: '60px 24px 100px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <a href="/" style={{ textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#6B0F0F', letterSpacing: '0.05em' }}>
            SantasLetter.ai
          </a>
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #c8922a 30%, #d4aa5a 50%, #c8922a 70%, transparent)', margin: '16px 0 0' }} />
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎅</div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#6B0F0F', fontWeight: 400, marginBottom: 16 }}>
              Thank you from the North Pole!
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(44,26,14,0.6)', lineHeight: 1.8, fontStyle: 'italic', marginBottom: 32 }}>
              Your review means the world to us — and helps other parents discover the magic of a personalised letter from Santa.
            </p>
            <a href="/create" style={{ display: 'inline-block', background: '#6B0F0F', color: '#d4aa5a', padding: '14px 36px', textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, border: '1px solid #d4aa5a' }}>
              ✦ Write another letter →
            </a>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎄</div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, color: '#6B0F0F', fontWeight: 400, marginBottom: 10 }}>
                How was your experience?
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(44,26,14,0.55)', lineHeight: 1.8, fontStyle: 'italic' }}>
                Your feedback helps us make Christmas magic for every child
              </p>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(200,146,42,0.3)', borderRadius: 8, padding: '36px 40px' }}>
              <form onSubmit={handleSubmit}>

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 13, color: 'rgba(44,26,14,0.5)', marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your rating</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        style={{
                          fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          color: star <= (hovered || rating) ? '#d4aa5a' : 'rgba(44,26,14,0.15)',
                          transition: 'color 0.15s',
                        }}>
                        ★
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <div style={{ fontSize: 13, color: 'rgba(44,26,14,0.5)', marginTop: 6, fontStyle: 'italic' }}>
                      {['', 'Poor', 'Fair', 'Good', 'Great', 'Magical!'][rating]}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(44,26,14,0.5)', marginBottom: 8 }}>Your name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(44,26,14,0.2)', borderRadius: 4, fontFamily: 'Georgia, serif', fontSize: 15, color: '#2c1a0e', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(44,26,14,0.5)', marginBottom: 8 }}>Child&apos;s name</label>
                  <input
                    type="text"
                    placeholder="e.g. Oliver"
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(44,26,14,0.2)', borderRadius: 4, fontFamily: 'Georgia, serif', fontSize: 15, color: '#2c1a0e', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(44,26,14,0.5)', marginBottom: 8 }}>Your review</label>
                  <textarea
                    placeholder="What did your child think? How was the experience?"
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    required
                    rows={4}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(44,26,14,0.2)', borderRadius: 4, fontFamily: 'Georgia, serif', fontSize: 15, color: '#2c1a0e', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {status === 'error' && (
                  <p style={{ color: '#c8382b', fontSize: 13, margin: '0 0 16px' }}>Something went wrong — please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={rating === 0 || status === 'loading'}
                  style={{
                    width: '100%', padding: '16px',
                    background: rating === 0 ? 'rgba(107,15,15,0.3)' : '#6B0F0F',
                    color: '#d4aa5a', border: '1px solid #d4aa5a',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 16, cursor: rating === 0 ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                  }}>
                  {status === 'loading' ? 'Submitting...' : '✦ Submit my review'}
                </button>

              </form>
            </div>
          </>
        )}

      </div>
    </main>
  )
}