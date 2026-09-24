import { withSentryConfig } from '@sentry/nextjs/config'

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
      // @vercel/nft cannot follow. Every route below runs in a deployed function
      // and needs those files present at runtime, so each one names them
      // explicitly rather than relying on nft to infer them.
      //
      // /sitemap.xml is why this exists. It only ever calls readdirSync, nothing
      // was traced, and once the route started revalidating it ran in a Lambda
      // that could not see content/blog: getAllPostSlugs() returned [] and every
      // blog URL silently vanished from the XML.
      //
      // /blog and /blog/[slug] did get their markdown traced, but only as a side
      // effect of nft observing reads while posts were prerendered. That is the
      // same implicit mechanism that failed for the sitemap, and it is not
      // guaranteed by anything: /blog/[slug] is dynamic, so losing those traces
      // would 404 every post rather than merely thin a file. Listing them makes
      // the dependency explicit and survives refactors of how paths are built.
      //
      // The glob is re-expanded at each build, so new posts need no change here.
      outputFileTracingIncludes: {
        '/sitemap.xml': ['./content/blog/**/*.md'],
        '/blog': ['./content/blog/**/*.md'],
        '/blog/[slug]': ['./content/blog/**/*.md'],
      },
    },
  }
  
  // Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and
  // SENTRY_PROJECT are set in the build environment; without them the build
  // still succeeds and Sentry shows minified stack traces.
  export default withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
  })
