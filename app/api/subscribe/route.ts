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

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Store in Supabase — ignore if already subscribed
    const { error: dbError } = await supabase
      .from('subscribers')
      .insert({ email, source: 'lead_magnet' })

    if (dbError && !dbError.message.includes('unique')) {
      console.error('Supabase error:', dbError)
    }

    // Send lead magnet email via Resend
    await resend.emails.send({
      from: 'Santa\'s Letter <hello@santasletter.ai>',
      to: email,
      subject: '🎄 Your 5 Magical Christmas Activities from Santa\'s Workshop',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5edd6;font-family:Georgia,serif;">
  <div style="max-width:600px;margin:0 auto;background:#fdf6e3;border:1px solid rgba(200,146,42,0.3);">

    <!-- Header -->
    <div style="background:#6B0F0F;padding:32px 40px;text-align:center;border-bottom:3px solid #d4aa5a;">
      <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:rgba(212,170,90,0.85);margin-bottom:6px;letter-spacing:0.08em;">From the Workshop of</div>
      <div style="font-family:Georgia,serif;font-style:italic;font-size:42px;color:#d4aa5a;line-height:1.1;">Santa Claus</div>
    </div>

    <!-- Body -->
    <div style="padding:40px 48px;">

      <p style="font-size:16px;color:#2c1a0e;line-height:1.8;margin:0 0 24px;font-style:italic;">
        Ho ho ho! You asked for some Christmas magic — and Santa always delivers. Here are five wonderful activities to share with your little ones this December.
      </p>

      <div style="height:1px;background:rgba(200,146,42,0.3);margin:0 0 32px;"></div>

      <!-- Activity 1 -->
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <span style="font-size:28px;margin-right:14px;">✉️</span>
          <div style="font-family:Georgia,serif;font-size:18px;color:#6B0F0F;font-style:italic;">1. Write a Letter to Santa</div>
        </div>
        <p style="font-size:14px;color:#2c1a0e;line-height:1.8;margin:0 0 0 42px;">
          Sit together and write Santa a letter — not just a wish list, but share something kind your child did this year. Seal it with a sticker and pop it in the post, or leave it by the fireplace on Christmas Eve. The act of writing it is the magic.
        </p>
      </div>

      <!-- Activity 2 -->
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <span style="font-size:28px;margin-right:14px;">🦌</span>
          <div style="font-family:Georgia,serif;font-size:18px;color:#6B0F0F;font-style:italic;">2. Make Reindeer Food</div>
        </div>
        <p style="font-size:14px;color:#2c1a0e;line-height:1.8;margin:0 0 0 42px;">
          Mix oats and glitter in a small bag — this is Rudolph's favourite! On Christmas Eve, sprinkle it on the lawn so the reindeer can find your house from the sky. Simple, free, and absolutely enchanting for little ones.
        </p>
      </div>

      <!-- Activity 3 -->
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <span style="font-size:28px;margin-right:14px;">⭐</span>
          <div style="font-family:Georgia,serif;font-size:18px;color:#6B0F0F;font-style:italic;">3. Create a Nice List Certificate</div>
        </div>
        <p style="font-size:14px;color:#2c1a0e;line-height:1.8;margin:0 0 0 42px;">
          Draw up an official "Nice List Certificate" for your child with their name, three kind things they did this year, and Santa's signature (yours, in your best cursive). Frame it or hang it on the tree — they will treasure it.
        </p>
      </div>

      <!-- Activity 4 -->
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <span style="font-size:28px;margin-right:14px;">🎄</span>
          <div style="font-family:Georgia,serif;font-size:18px;color:#6B0F0F;font-style:italic;">4. The Christmas Kindness Countdown</div>
        </div>
        <p style="font-size:14px;color:#2c1a0e;line-height:1.8;margin:0 0 0 42px;">
          Each day of December, do one small act of kindness as a family — leave cookies for a neighbour, donate a toy, call a grandparent. Write each one on a slip of paper and put it in a jar. Read them all together on Christmas morning.
        </p>
      </div>

      <!-- Activity 5 -->
      <div style="margin-bottom:40px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <span style="font-size:28px;margin-right:14px;">🗺️</span>
          <div style="font-family:Georgia,serif;font-size:18px;color:#6B0F0F;font-style:italic;">5. Draw a Christmas Wish Map</div>
        </div>
        <p style="font-size:14px;color:#2c1a0e;line-height:1.8;margin:0 0 0 42px;">
          Instead of a plain wish list, draw a map together. Include the North Pole, Santa's workshop, your house, and little illustrations of each wish. This becomes a keepsake — and Santa finds illustrated maps much easier to read than typed lists.
        </p>
      </div>

      <div style="height:1px;background:rgba(200,146,42,0.3);margin:0 0 32px;"></div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:32px;">
        <p style="font-size:15px;color:#2c1a0e;line-height:1.8;margin:0 0 20px;font-style:italic;">
          Want to make Christmas even more magical? Give your child a personalised letter from Santa — written just for them, mentioning their name, their kind deeds, and their wishes.
        </p>
        <a href="https://www.santasletter.ai/create" style="display:inline-block;background:#6B0F0F;color:#d4aa5a;padding:14px 36px;text-decoration:none;font-family:Georgia,serif;font-size:15px;letter-spacing:0.06em;border:1px solid #d4aa5a;">
          ✦ Create your child's free letter →
        </a>
      </div>

      <!-- Sign off -->
      <div style="border-top:1px solid rgba(200,146,42,0.2);padding-top:24px;">
        <div style="font-size:13px;color:rgba(44,26,14,0.5);margin-bottom:4px;font-style:italic;">With love and Christmas magic,</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:36px;color:#6B0F0F;line-height:1.1;">Santa Claus</div>
        <div style="font-size:11px;color:rgba(44,26,14,0.4);margin-top:6px;">via SantasLetter.ai · Official North Pole Post Office</div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#6B0F0F;padding:16px 40px;text-align:center;">
      <div style="font-size:11px;color:rgba(212,170,90,0.7);line-height:1.8;">
        SantasLetter.ai · Official North Pole Post Office<br>
        <a href="https://www.santasletter.ai/privacy" style="color:rgba(212,170,90,0.5);text-decoration:none;">Privacy Policy</a>
        &nbsp;·&nbsp;
        You received this because you signed up at SantasLetter.ai
      </div>
    </div>

  </div>
</body>
</html>
      `,
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}