import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alert'

// TEMPORARY: one-off check that the ALERT_WEBHOOK_URL stored in production
// reaches Slack after the Sep 28 rotation. Remove after the test.
//
//     curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//       https://www.santasletter.ai/api/admin/test-alert
//
// POST only, so a link preview or prefetch cannot fire it. Returns the result
// of the send, never the webhook URL.

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sendAlert(
    `✅ Test alert from production (${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown commit'}): ` +
    `ALERT_WEBHOOK_URL is working after the rotation. No action needed.`
  )
  return NextResponse.json(result, { status: result.sent ? 200 : 502 })
}
