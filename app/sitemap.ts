import { MetadataRoute } from 'next'
import { getAllPostSlugs } from '@/lib/blog'

// Without this the route is fully static: getAllPostSlugs() runs once at build
// time and the XML is frozen until the next deploy, so a post whose publishDate
// passes never reaches the sitemap. It also makes the route eligible for
// revalidatePath('/sitemap.xml'), which /api/cron/revalidate-blog calls hourly;
// a static route has no cache entry for that call to purge.
export const revalidate = 3600

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.santasletter.ai'
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/create`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refunds`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/video`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  const slugs = getAllPostSlugs()

  // getAllPostSlugs() returns [] when it cannot see content/blog, which is
  // indistinguishable from "there are no posts" at this layer. That happened in
  // production: the deployed function had none of the markdown traced into it,
  // so this route published a sitemap with all 16 blog URLs silently removed.
  //
  // next.config.mjs now forces those files into the bundle, but an empty list
  // here still means something is wrong rather than that the blog is empty.
  // Throwing fails the ISR revalidation, which leaves the previous good XML in
  // the cache instead of replacing it with a valid-looking, near-empty sitemap.
  // At build time it fails the build outright, which is also what we want.
  if (slugs.length === 0) {
    throw new Error(
      'sitemap: getAllPostSlugs() returned no slugs. Refusing to emit a sitemap ' +
        'with no blog URLs; check that content/blog is present in this bundle.'
    )
  }

  const blogPosts: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...blogPosts]
}