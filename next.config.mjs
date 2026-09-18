/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    experimental: {
      // lib/blog.ts reads content/blog through a path built at runtime, which
      // @vercel/nft cannot follow. It happens to trace the files for /blog (that
      // route prerenders each post at build time, so the reads are observed),
      // but /sitemap.xml only ever calls readdirSync, so nothing is traced and
      // the deployed function sees no content/blog at all.
      //
      // That was harmless while the route was static and ran only at build time.
      // Now that it revalidates, it runs in a Lambda, where the missing files
      // made getAllPostSlugs() return [] and dropped every blog URL.
      outputFileTracingIncludes: {
        '/sitemap.xml': ['./content/blog/**/*.md'],
      },
    },
  }
  
  export default nextConfig
