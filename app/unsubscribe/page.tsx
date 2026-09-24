import { verifyUnsubscribeToken, markUnsubscribed, isUnsubscribed } from '@/lib/unsubscribe'
import UnsubscribedCard from './UnsubscribedCard'

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
  // Set when the unsubscribe could not be saved. The page must then say so
  // rather than tell the person they are unsubscribed while mail keeps coming.
  let markFailed = false
  if (!invalidLink && email) {
    try {
      alreadyUnsubscribed = await isUnsubscribed(email)
    } catch (err) {
      // The lookup only decides whether to skip a write. If it fails, go on and
      // write: marking an address unsubscribed twice is harmless.
      console.error('Unsubscribe status lookup failed, attempting unsubscribe anyway:', err)
    }
    if (!alreadyUnsubscribed) {
      try {
        await markUnsubscribed(email)
      } catch (err) {
        console.error('Failed to mark unsubscribed:', err)
        markFailed = true
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
        ) : markFailed ? (
          <div style={{
            background: 'rgba(212,170,90,0.06)',
            border: '1px solid rgba(212,170,90,0.3)',
            borderRadius: 6,
            padding: '40px 32px',
          }}>
            <h1 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 16px', color: '#f5ead8' }}>
              We couldn&rsquo;t unsubscribe you just now
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(245,234,216,0.7)', lineHeight: 1.7, margin: '0 0 16px' }}>
              Something went wrong on our side and your request wasn&rsquo;t saved. Please reload this page to try again, or email us and we&rsquo;ll remove you by hand:
            </p>
            <a href="mailto:hello@santasletter.ai" style={{ color: '#d4aa5a', fontSize: 15 }}>
              hello@santasletter.ai
            </a>
          </div>
        ) : (
          <UnsubscribedCard
            email={email!}
            token={token!}
            alreadyUnsubscribed={alreadyUnsubscribed}
          />
        )}

        <p style={{ marginTop: 32, fontSize: 11, color: 'rgba(245,234,216,0.25)' }}>
          SantasLetter.ai · Official North Pole Post Office
        </p>
      </div>
    </main>
  )
}
