import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Scheduled posts are gated by isPublished() in lib/blog.ts, which compares
// frontmatter publishDate against the current time. That check only re-runs when
// a route is actually rendered, so a cached route keeps serving the pre-publish
// version until its cache entry expires.
//
// Two routes are affected, and only these two:
//   /blog         ISR at 3600s, but revalidation is request-triggered. On a quiet
//                 day the window can pass with nobody visiting, and the first
//                 visitor afterwards still gets the stale list while the rebuild
//                 happens behind them.
//   /sitemap.xml  ISR at 3600s as of this commit. Previously fully static, which
//                 meant it never picked up a scheduled post at all.
//
// /blog/[slug] is deliberately absent: it has no generateStaticParams, so Next
// renders it on demand for every request and isPublished() is already evaluated
// per request. There is no cache entry to purge.
const PATHS = ['/blog', '/sitemap.xml']

export async function GET(req: NextRequest) {
  // Auth — must match Vercel cron's Authorization: Bearer <CRON_SECRET> header
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  for (const path of PATHS) {
    revalidatePath(path)
  }

  return NextResponse.json({
    revalidated: PATHS,
    at: new Date().toISOString(),
  })
}
