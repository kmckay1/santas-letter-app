import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const { data: requests, error } = await supabase
    .from('review_requests')
    .select('*')
    .eq('sent', false)
    .lte('send_after', today)

  if (error) {
    console.error('Error fetching review requests:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!requests || requests.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  let failed = 0

  for (const request of requests) {
    try {
      await resend.emails.send({
        from: "Santa's Letter <hello@santasletter.ai>",
        to: request.recipient_email,
        subject: `Did ${request.child_name} love their letter from Santa? 🎅`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5edd6;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;background:#fdf6e3;border:1px solid rgba(200,146,42,0.3);">

  <div style="background:#6B0F0F;padding:28px 40px;text-align:center;border-bottom:3px solid #d4aa5a;">
    <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:rgba(212,170,90,0.85);margin-bottom:4px;">From the Desk of</div>
    <div style="font-family:Georgia,serif;font-style:italic;font-size:38px;color:#d4aa5a;line-height:1.1;">Santa Claus</div>
  </div>

  <div style="padding:36px 48px;">
    <p style="font-size:16px;color:#2c1a0e;line-height:1.8;margin:0 0 20px;font-style:italic;">
      Ho ho ho! It has been ten days since ${request.child_name}'s letter made its way from the North Pole — and I do hope it brought a little magic to your home.
    </p>
    <p style="font-size:15px;color:#2c1a0e;line-height:1.8;margin:0 0 24px;">
      The elves and I would be ever so grateful if you could share a few words about your experience. Reviews from families like yours help other parents discover the magic of a personalised letter — and they mean the world to us at the North Pole Post Office.
    </p>

    <div style="height:1px;background:rgba(200,146,42,0.3);margin:0 0 28px;"></div>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://www.santasletter.ai/review" style="display:inline-block;background:#6B0F0F;color:#d4aa5a;padding:16px 40px;text-decoration:none;font-family:Georgia,serif;font-size:16px;letter-spacing:0.06em;border:1px solid #d4aa5a;">
        ✦ Leave a review for ${request.child_name}'s letter →
      </a>
    </div>

    <p style="font-size:13px;color:rgba(44,26,14,0.5);line-height:1.8;margin:0 0 24px;text-align:center;font-style:italic;">
      It takes less than two minutes — just a star rating and a sentence or two is perfect.
    </p>

    <div style="height:1px;background:rgba(200,146,42,0.3);margin:0 0 24px;"></div>

    <div style="text-align:center;margin-bottom:8px;">
      <p style="font-size:14px;color:#2c1a0e;margin:0 0 16px;">Got another child on the Nice List?</p>
      <a href="https://www.santasletter.ai/create" style="display:inline-block;background:rgba(107,15,15,0.08);color:#6B0F0F;padding:12px 32px;text-decoration:none;font-family:Georgia,serif;font-size:14px;border:1px solid rgba(107,15,15,0.3);">
        Write another letter →
      </a>
    </div>

    <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(200,146,42,0.2);">
      <div style="font-size:13px;color:rgba(44,26,14,0.5);margin-bottom:4px;font-style:italic;">With all the love and magic of Christmas,</div>
      <div style="font-family:Georgia,serif;font-style:italic;font-size:32px;color:#6B0F0F;line-height:1.1;">Santa Claus</div>
      <div style="font-size:11px;color:rgba(44,26,14,0.4);margin-top:6px;">via SantasLetter.ai · Official North Pole Post Office</div>
    </div>
  </div>

  <div style="background:#6B0F0F;padding:14px 40px;text-align:center;">
    <div style="font-size:11px;color:rgba(212,170,90,0.7);line-height:1.8;">
      SantasLetter.ai · Official North Pole Post Office<br>
      <a href="https://www.santasletter.ai/privacy" style="color:rgba(212,170,90,0.5);text-decoration:none;">Privacy Policy</a>
      &nbsp;·&nbsp;
      You received this because you ordered at SantasLetter.ai
    </div>
  </div>

</div>
</body>
</html>
        `,
      })

      await supabase
        .from('review_requests')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', request.id)

      console.log(`✅ Review request sent to ${request.recipient_email}`)
      sent++
    } catch (err) {
      console.error(`❌ Failed to send review request to ${request.recipient_email}:`, err)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, total: requests.length })
}