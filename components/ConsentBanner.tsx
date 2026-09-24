'use client'

import { useEffect, useState } from 'react'
import { CONSENT_COOKIE, CONSENT_MARKETING, CONSENT_DECLINED } from '@/lib/consent'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

declare global {
  interface Window {
    _fbq?: unknown
  }
}

function readConsent(): string | null {
  const entry = document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${CONSENT_COOKIE}=`))
  return entry ? entry.slice(CONSENT_COOKIE.length + 1) : null
}

function writeConsent(value: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
}

// Meta's standard base code, run only after consent. It installs the fbq queue
// stub, appends fbevents.js from connect.facebook.net, then initialises and
// records the page view. The window.fbq check makes a second call a no-op, so
// a remount or React's development double-effect cannot init the Pixel twice.
function loadMetaPixel() {
  if (!IS_PRODUCTION || !PIXEL_ID) return
  if (typeof window.fbq === 'function') return

  const queue: unknown[] = []
  const fbq = function (...args: unknown[]) {
    const self = fbq as unknown as { callMethod?: (...a: unknown[]) => void }
    if (self.callMethod) self.callMethod(...args)
    else queue.push(args)
  } as unknown as NonNullable<Window['fbq']> & Record<string, unknown>
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = queue
  window.fbq = fbq
  if (!window._fbq) window._fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  // The typed wrapper in lib/pixel.ts only knows 'track' and 'trackCustom'.
  const call = window.fbq as unknown as (...args: unknown[]) => void
  call('init', PIXEL_ID)
  call('track', 'PageView')
}

export default function ConsentBanner() {
  // Starts hidden and is revealed after mount, because the cookie can only be
  // read in the browser. Rendering it on the server would flash the banner at
  // visitors who have already answered.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = readConsent()
    if (consent === CONSENT_MARKETING) loadMetaPixel()
    else if (consent === null) setVisible(true)
  }, [])

  function accept() {
    writeConsent(CONSENT_MARKETING)
    setVisible(false)
    loadMetaPixel()
  }

  function decline() {
    writeConsent(CONSENT_DECLINED)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 3000,
        background: 'rgba(6,14,28,0.97)',
        borderTop: '1px solid rgba(212,170,90,0.35)',
        padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14,
        fontFamily: "'Lora', Georgia, serif",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, color: 'rgba(245,234,216,0.85)', lineHeight: 1.6 }}>
        We use cookies to improve your experience and measure ad performance.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={decline}
          style={{
            padding: '9px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 14,
            background: 'transparent', color: '#f5ead8',
            border: '1px solid rgba(245,234,216,0.3)', fontFamily: 'inherit',
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: '9px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 14,
            background: 'linear-gradient(135deg, #c8382b 0%, #9b1f1f 100%)', color: '#fff',
            border: 'none', fontFamily: 'inherit',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  )
}
