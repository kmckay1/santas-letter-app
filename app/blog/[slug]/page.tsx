import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPost } from '@/lib/blog'

export const revalidate = 3600

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug)
  if (!post) return {}
  const url = `https://www.santasletter.ai/blog/${post.slug}`
  return {
    title: `${post.title} | SantasLetter.ai`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: 'SantasLetter.ai',
      type: 'article',
      images: ['https://www.santasletter.ai/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['https://www.santasletter.ai/og-image.png'],
    },
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()
  const formattedDate = post.date
    ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'SantasLetter.ai' },
    publisher: { '@type': 'Organization', name: 'SantasLetter.ai' },
    mainEntityOfPage: `https://www.santasletter.ai/blog/${post.slug}`,
  }
  return (
    <main style={{ minHeight: '100vh', background: '#fdf6e3', fontFamily: 'Georgia, serif', color: '#2c1a0e', padding: '60px 24px 100px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <a href="/" style={{ textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#6B0F0F', letterSpacing: '0.05em' }}>
            SantasLetter.ai
          </a>
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #c8922a 30%, #d4aa5a 50%, #c8922a 70%, transparent)', margin: '16px 0 0' }} />
        </div>
        <article>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 34, lineHeight: 1.25, color: '#6B0F0F', fontWeight: 400, marginBottom: 12 }}>
            {post.title}
          </h1>
          {formattedDate && (
            <p style={{ fontSize: 13, color: 'rgba(44,26,14,0.5)', marginBottom: 32, fontStyle: 'italic' }}>{formattedDate}</p>
          )}
          <div style={{ height: 1, background: 'rgba(200,146,42,0.3)', marginBottom: 32 }} />
          <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.html }} />
        </article>
        <div style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid rgba(200,146,42,0.3)', textAlign: 'center' }}>
          <a href="/create" style={{ display: 'inline-block', background: '#6B0F0F', color: '#fdf6e3', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, padding: '14px 32px', borderRadius: 4, textDecoration: 'none', marginBottom: 28, letterSpacing: '0.03em' }}>
            Write your child&rsquo;s letter from Santa →
          </a>
          <div>
            <a href="/blog" style={{ color: '#6B0F0F', fontSize: 13, marginRight: 24, textDecoration: 'none' }}>← All articles</a>
            <a href="/" style={{ color: '#6B0F0F', fontSize: 13, textDecoration: 'none' }}>Back to SantasLetter.ai</a>
          </div>
        </div>
      </div>
    </main>
  )
}