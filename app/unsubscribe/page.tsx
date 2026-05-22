import { verifyUnsubscribeToken, markUnsubscribed, isUnsubscribed } from '@/lib/unsubscribe'
import ResubscribeButton from './ResubscribeButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { email?: string; token?: string }
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const email = searchParams.email?.toLowerCase().trim()
  const token = searchParams.token

  const invalidLink =
    !email ||
    !token ||
    !email.includes('@') ||
    !verifyUnsubscribeToken(email, token)

  let alreadyUnsubscribed = false
  if (!invalidLink && email) {
    alreadyUnsubscribed = await isUnsubscribed(email)
    if (!alreadyUnsubscribed) {
      try {
        await markUnsubscribed(email)
      } catch (err) {
        console.error('Failed to mark unsubscribed:', err)
      }
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0d1b2e',
      fontFamily: 'Georgia, serif',
      color: '#f5ead8',
      padding: '60px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4aa5a', margin: '0 0 8px' }}>
            SantasLetter.ai
          </p>
          <p style={{ fontSize: 13, color: 'rgba(245,234,216,0.5)', fontStyle: 'italic', margin: 0 }}>
            North Pole Post Office
          </p>
        </div>

        {invalidLink ? (
          <div style={{
            background: 'rgba(212,170,90,0.06)',
            border: '1px solid rgba(212,170,90,0.3)',
            borderRadius: 6,
            padding: '40px 32px',
          }}>
            <h1 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 16px', color: '#f5ead8' }}>
              This link doesn&rsquo;t look right
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7, margin: '0 0 16px' }}>
              The unsubscribe link is invalid or has expired. If you&rsquo;re still receiving emails you didn&rsquo;t ask for, please reply to any email from us, or contact:
            </p>
            <a href="mailto:hello@santasletter.ai" style={{ color: '#d4aa5a', fontSize: 15 }}>
              hello@santasletter.ai
            </a>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(212,170,90,0.3)',
            borderRadius: 6,
            padding: '40px 32px',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <h1 style={{ fontSize: 26, fontWeight: 400, margin: '0 0 16px', color: '#f5ead8' }}>
              {alreadyUnsubscribed
                ? 'You\u2019re already unsubscribed'
                : 'You\u2019ve been unsubscribed'}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7, margin: '0 0 24px' }}>
              We won&rsquo;t send any more emails to <strong style={{ color: '#f5ead8' }}>{email}</strong>.
              {!alreadyUnsubscribed && ' Sorry to see you go — Santa hopes Christmas is still magical for your family.'}
            </p>

            <div style={{
              borderTop: '1px solid rgba(245,234,216,0.1)',
              paddingTop: 24,
              marginTop: 24,
            }}>
              <p style={{ fontSize: 13, color: 'rgba(245,234,216,0.5)', margin: '0 0 16px' }}>
                Changed your mind?
              </p>
              <ResubscribeButton email={email!} token={token!} />
            </div>
          </div>
        )}

        <p style={{ marginTop: 32, fontSize: 11, color: 'rgba(245,234,216,0.25)' }}>
          SantasLetter.ai · Official North Pole Post Office
        </p>
      </div>
    </main>
  )
}