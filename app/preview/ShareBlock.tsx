'use client'

import { useState } from 'react'
import { referralLinkFor } from '@/lib/referral'

// Sits below the paid tiers rather than above them. The share action is free, so
// putting it first would compete with the $9 and $29 offers for the same glance.
export default function ShareBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  if (!code) return null

  const link = referralLinkFor(code)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Older browsers, and any page not served over https, reject the clipboard
      // API. The link is on screen and selectable, so failing quietly is enough.
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: 'linear-gradient(160deg, #0e1c35 0%, #080f20 100%)',
      border: '1px solid rgba(212,170,90,0.3)',
      borderRadius: 12,
      padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 36px)',
      marginTop: 20,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d4aa5a', marginBottom: 10 }}>
          ✦ pass it on ✦
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(19px, 3.6vw, 24px)', color: '#f5ead8', fontWeight: 400, margin: '0 0 8px', lineHeight: 1.3 }}>
          Give a friend&rsquo;s child a free letter from Santa
        </h2>
        <p style={{ color: 'rgba(245,234,216,0.45)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          Share your link. When they write their letter, you both get the premium
          illustrated PDF free.
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'stretch',
        justifyContent: 'center',
      }}>
        <code style={{
          flex: '1 1 260px',
          minWidth: 0,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(245,234,216,0.14)',
          borderRadius: 6,
          padding: '12px 14px',
          color: '#f5ead8',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          overflowWrap: 'anywhere',
          textAlign: 'center',
        }}>
          {link}
        </code>
        <button
          onClick={copy}
          style={{
            flex: '0 0 auto',
            padding: '12px 22px',
            background: copied ? 'rgba(212,170,90,0.2)' : 'linear-gradient(135deg, #c8382b 0%, #8B1A1A 100%)',
            color: copied ? '#d4aa5a' : '#fff',
            border: copied ? '1px solid rgba(212,170,90,0.4)' : 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 14,
            whiteSpace: 'nowrap',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(245,234,216,0.2)', margin: '14px 0 0', lineHeight: 1.7 }}>
        Your code: {code}
      </p>
    </div>
  )
}
