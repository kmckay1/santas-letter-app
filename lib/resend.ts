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
  _letterId: string
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
export async function sendPremiumPDFEmail(
  email: string,
  childName: string,
  pdfBuffer: Buffer
): Promise<void> {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'Santa Claus <santa@santasletter.ai>',
    to: email,
    subject: `🎁 ${childName}'s official letter from Santa — your PDF is here!`,
    attachments: [
      {
        filename: `Santas-Letter-${childName.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:40px 20px;background:#0d1b2e;font-family:Georgia,serif;">
        <div style="max-width:540px;margin:0 auto;">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:32px;">
            <p style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#d4aa5a;margin:0 0 6px;">SantasLetter.ai</p>
            <p style="font-size:12px;color:rgba(245,234,216,0.45);margin:0;font-style:italic;">Official North Pole Post Office</p>
          </div>

          <!-- Main card -->
          <div style="background:linear-gradient(160deg,#1a2d45,#0f1f33);border:1px solid rgba(212,170,90,0.3);border-radius:6px;padding:36px 40px;text-align:center;margin-bottom:24px;">
            <div style="font-size:52px;margin-bottom:16px;">📜</div>
            <h1 style="font-size:22px;color:#f5ead8;font-weight:400;margin:0 0 10px;font-family:Georgia,serif;">
              ${childName}'s letter is ready!
            </h1>
            <p style="font-size:14px;color:rgba(245,234,216,0.6);margin:0 0 24px;line-height:1.7;">
              Attached is the official premium PDF — beautifully illustrated<br>and ready to print or save forever.
            </p>
            <div style="background:rgba(212,170,90,0.08);border:1px solid rgba(212,170,90,0.2);border-radius:4px;padding:14px 20px;display:inline-block;">
              <p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#d4aa5a;margin:0 0 4px;">Attached file</p>
              <p style="font-size:13px;color:#f5ead8;margin:0;">📎 Santas-Letter-${childName.replace(/\s+/g, '-')}.pdf</p>
            </div>
          </div>

          <!-- Tips -->
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:20px 24px;margin-bottom:24px;">
            <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#d4aa5a;margin:0 0 12px;">Tips for maximum magic ✨</p>
            <p style="font-size:13px;color:rgba(245,234,216,0.6);margin:0 0 8px;">🖨️ <strong style="color:rgba(245,234,216,0.85);">Print it out</strong> — looks stunning on cream or white paper</p>
            <p style="font-size:13px;color:rgba(245,234,216,0.6);margin:0 0 8px;">📱 <strong style="color:rgba(245,234,216,0.85);">Save it</strong> — a keepsake for years to come</p>
            <p style="font-size:13px;color:rgba(245,234,216,0.6);margin:0;">🎁 <strong style="color:rgba(245,234,216,0.85);">Share it</strong> — in a frame or tucked under the tree</p>
          </div>

          <p style="text-align:center;font-size:11px;color:rgba(245,234,216,0.2);margin:0;">
            SantasLetter.ai · Made with ❤ in Amsterdam<br>
            Questions? Just reply to this email.
          </p>
        </div>
      </body>
      </html>
    `,
  })
}