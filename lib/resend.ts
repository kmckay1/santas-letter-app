import { StoredLetter } from './storage'

// Install: npm install resend
// Get API key at resend.com — free tier is very generous

export async function sendFreeLetterEmail(
  email: string,
  letter: StoredLetter
): Promise<void> {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const letterHtml = letter.letterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 20px;line-height:1.8;color:#1a0a02;font-size:16px;font-family:Georgia,serif;">${p.replace(/\*/g, '')}</p>`)
    .join('')

  await resend.emails.send({
    from: 'Santa Claus <santa@santasletter.ai>',
    to: email,
    subject: `🎅 A letter from Santa, just for ${letter.child.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#0d1b2e;font-family:Georgia,serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          
          <!-- Header -->
          <div style="text-align:center;margin-bottom:32px;">
            <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#d4aa5a;margin:0 0 8px;">SantasLetter.ai</p>
            <p style="font-size:13px;color:rgba(245,234,216,0.5);margin:0;font-style:italic;">A letter from the North Pole</p>
          </div>

          <!-- Letter card -->
          <div style="background:linear-gradient(175deg,#fffef5 0%,#fdf8e8 100%);border-radius:4px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.4);">
            <div style="height:6px;background:linear-gradient(90deg,#5a0a0a,#c8382b 30%,#d4aa5a 50%,#c8382b 70%,#5a0a0a);"></div>
            <div style="padding:40px 44px;">
              <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(100,50,20,0.45);margin:0 0 8px;font-family:Georgia,serif;">The Official North Pole Post Office</p>
              <p style="font-family:Georgia,serif;font-size:24px;color:#150800;margin:0 0 24px;">Dear ${letter.child.name},</p>
              <hr style="border:none;border-top:1px solid rgba(139,90,43,0.15);margin:0 0 24px;">
              ${letterHtml}
              <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(139,90,43,0.12);">
                <p style="font-size:13px;color:rgba(44,21,8,0.5);margin:0 0 6px;font-style:italic;">With all the love and magic of Christmas,</p>
                <p style="font-family:Georgia,serif;font-style:italic;font-size:44px;color:#7B1010;margin:0;line-height:1.1;">Santa Claus</p>
              </div>
            </div>
          </div>

          <!-- Upsell -->
          <div style="margin-top:28px;padding:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,170,90,0.2);border-radius:6px;text-align:center;">
            <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#d4aa5a;margin:0 0 10px;">Make it extra magical</p>
            <p style="font-size:18px;color:#f5ead8;margin:0 0 8px;font-family:Georgia,serif;">Get the official printed letter</p>
            <p style="font-size:13px;color:rgba(245,234,216,0.5);margin:0 0 20px;">A premium illustrated PDF or a real letter in the post</p>
            <a href="https://santasletter.ai/preview?letter_id=${letter.id}" 
               style="display:inline-block;background:linear-gradient(135deg,#c8382b,#9b1f1f);color:#fff;padding:13px 32px;border-radius:4px;text-decoration:none;font-family:Georgia,serif;font-size:15px;">
              ✦ Upgrade my letter
            </a>
          </div>

          <p style="text-align:center;margin-top:24px;font-size:11px;color:rgba(245,234,216,0.25);">
            SantasLetter.ai · Made with ❤ in Amsterdam<br>
            <a href="https://santasletter.ai/unsubscribe" style="color:rgba(245,234,216,0.3);">Unsubscribe</a>
          </p>
        </div>
      </body>
      </html>
    `,
  })
}

export async function sendOrderConfirmationEmail(
  email: string,
  childName: string,
  tier: string,
  letterId: string
): Promise<void> {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const tierLabels: Record<string, string> = {
    premium: 'Premium PDF',
    physical: 'Physical Letter',
    bundle: 'Premium PDF + Physical Letter',
  }

  await resend.emails.send({
    from: 'Santa Claus <santa@santasletter.ai>',
    to: email,
    subject: `🎁 Order confirmed — ${childName}'s letter is on its way!`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:40px 20px;background:#0d1b2e;font-family:Georgia,serif;">
        <div style="max-width:500px;margin:0 auto;text-align:center;">
          <p style="font-size:48px;margin:0 0 20px;">🎅</p>
          <h1 style="font-size:24px;color:#f5ead8;font-weight:400;margin:0 0 12px;">Order confirmed!</h1>
          <p style="color:rgba(245,234,216,0.6);font-size:15px;margin:0 0 28px;">${childName}'s ${tierLabels[tier] || tier} is being prepared</p>
          
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(212,170,90,0.2);border-radius:6px;padding:24px;text-align:left;margin-bottom:24px;">
            <p style="color:#d4aa5a;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px;">Your order</p>
            <p style="color:#f5ead8;font-size:16px;margin:0 0 4px;">${tierLabels[tier] || tier}</p>
            <p style="color:rgba(245,234,216,0.5);font-size:13px;margin:0;">For: ${childName}</p>
            ${tier === 'physical' || tier === 'bundle' ? `<p style="color:rgba(245,234,216,0.5);font-size:13px;margin:8px 0 0;">📬 Physical letter arriving in 5–7 days</p>` : ''}
            ${tier === 'premium' || tier === 'bundle' ? `<p style="color:rgba(245,234,216,0.5);font-size:13px;margin:4px 0 0;">📄 Premium PDF sent to this email</p>` : ''}
          </div>

          <p style="color:rgba(245,234,216,0.3);font-size:11px;">Questions? Reply to this email and an elf will help.</p>
        </div>
      </body>
      </html>
    `,
  })
}