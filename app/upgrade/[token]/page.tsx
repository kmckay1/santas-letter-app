import { getLetterByUpgradeToken } from '@/lib/storage'
import { notFound } from 'next/navigation'
import UpgradeButtons from './UpgradeButtons'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { token: string }
}

export default async function UpgradePage({ params }: PageProps) {
  const letter = await getLetterByUpgradeToken(params.token)

  if (!letter) {
    notFound()
  }

  // If already fulfilled at premium or bundle tier, show a different message
  const alreadyUpgraded = !!(letter.fulfilled && (letter.tier === 'premium' || letter.tier === 'bundle'))

  // Preview = first paragraph only (teaser)
  const firstParagraph = letter.letterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => p.replace(/\*/g, ''))[0] || ''

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0d1b2e',
      fontFamily: 'Georgia, serif',
      color: '#f5ead8',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4aa5a', margin: '0 0 8px' }}>
            SantasLetter.ai
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 400, margin: '0 0 8px' }}>
            {letter.child.name}&rsquo;s letter, but as a real keepsake
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(245,234,216,0.5)', fontStyle: 'italic', margin: 0 }}>
            The same letter you received — beautifully designed and ready to print
          </p>
        </div>

        {alreadyUpgraded && (
          <div style={{
            background: 'rgba(212,170,90,0.08)',
            border: '1px solid rgba(212,170,90,0.3)',
            borderRadius: 6,
            padding: 20,
            marginBottom: 32,
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, color: '#d4aa5a' }}>
              You&rsquo;ve already upgraded this letter. Check your inbox for the PDF.
            </p>
          </div>
        )}

        {/* Letter preview teaser */}
        <div style={{
          background: 'linear-gradient(175deg,#fffef5 0%,#fdf8e8 100%)',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          marginBottom: 32,
          position: 'relative',
        }}>
          <div style={{ height: 6, background: 'linear-gradient(90deg,#5a0a0a,#c8382b 30%,#d4aa5a 50%,#c8382b 70%,#5a0a0a)' }} />
          <div style={{ padding: '40px 44px', position: 'relative' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(100,50,20,0.45)', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
              The Official North Pole Post Office
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#150800', margin: '0 0 24px' }}>
              Dear {letter.child.name},
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(139,90,43,0.15)', margin: '0 0 24px' }} />
            <p style={{ margin: '0 0 20px', lineHeight: 1.8, color: '#1a0a02', fontSize: 16, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {firstParagraph}
            </p>

            {/* Fade-out teaser */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background: 'linear-gradient(to bottom, rgba(253,248,232,0) 0%, rgba(253,248,232,1) 100%)',
              pointerEvents: 'none',
            }} />
          </div>
        </div>

        {/* Value framing */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{ fontSize: 16, color: 'rgba(245,234,216,0.75)', lineHeight: 1.7, margin: '0 auto', maxWidth: 540 }}>
            The free letter is yours to read.<br />
            The premium version is yours to <em>keep</em> — printable, frameable, designed like a real letter from the North Pole.
          </p>
        </div>

        {/* Upgrade tier cards */}
        <UpgradeButtons
          upgradeToken={params.token}
          childName={letter.child.name}
          alreadyUpgraded={alreadyUpgraded}
        />

        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: 'rgba(245,234,216,0.25)' }}>
          Secure checkout via Stripe · Money-back if you&rsquo;re not delighted
        </p>
      </div>
    </main>
  )
}