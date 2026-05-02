import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/success', '/preview'],
      },
    ],
    sitemap: 'https://www.santasletter.ai/sitemap.xml',
    host: 'https://www.santasletter.ai',
  }
}