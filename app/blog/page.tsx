import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'The North Pole Post — Stories & Christmas Magic | SantasLetter.ai',
  description: 'Thoughts on keeping Christmas magical, the believing years, and making the holidays unforgettable for your child. From the team behind SantasLetter.ai.',
  alternates: { canonical: 'https://www.santasletter.ai/blog' },
  openGraph: {
    title: 'The North Pole Post | SantasLetter.ai',
    description: 'Stories on keeping Christmas magical and making the holidays unforgettable for your child.',
    url: 'https://www.santasletter.ai/blog',
    siteName: 'SantasLetter.ai',
    type: 'website',
    images: ['https://www.santasletter.ai/og-image.png'],
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <main style={{ minHeight: '100vh', background: '#fdf6e3', fontFamily: 'Georgia, serif', color: '#2c1a0e', padding: '60px 24px 100px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <a href="/" style={{ textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#6B0F0F', letterSpacing: '0.05em' }}>
            SantasLetter.ai
          </a>
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #c8922a 30%, #d4aa5a 50%, #c8922a 70%, transparent)', margin: '16px 0 0' }} />
        </div>

        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#6B0F0F', fontWeight: 400, marginBottom: 8, textAlign: 'center' }}>
          The North Pole Post
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(44,26,14,0.6)', marginBottom: 48, textAlign: 'center', fontStyle: 'italic' }}>
          Stories on keeping Christmas magical, written for parents.
        </p>

        {posts.length === 0 ? (
          <p style={{ fontSize: 15, textAlign: 'center', color: 'rgba(44,26,14,0.5)' }}>No articles yet — check back soon.</p>
        ) : (
          posts.map((post) => {
            const formattedDate = post.date
              ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : ''
            return (
              <a key={post.slug} href={`/blog/${post.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 40, paddingBottom: 32, borderBottom: '1px solid rgba(200,146,42,0.3)' }}>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 23, lineHeight: 1.3, color: '#6B0F0F', fontWeight: 400, marginBottom: 8 }}>
                  {post.title}
                </h2>
                {formattedDate && (
                  <p style={{ fontSize: 12, color: 'rgba(44,26,14,0.5)', marginBottom: 12, fontStyle: 'italic' }}>{formattedDate}</p>
                )}
                <p style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 10 }}>{post.excerpt}</p>
                <span style={{ fontSize: 14, color: '#c8922a', fontStyle: 'italic' }}>Read more →</span>
              </a>
            )
          })
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <a href="/" style={{ color: '#6B0F0F', fontSize: 13, textDecoration: 'none' }}>← Back to SantasLetter.ai</a>
        </div>

      </div>
    </main>
  )
}