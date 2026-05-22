import { StoredLetter } from './storage'
import { generateUnsubscribeUrl } from './unsubscribe'

// Phase 2 nurture sequence — fires on Day 3, Day 7, Day 14 post letter generation.
// Sender identity matches Phase 1 (santa@santasletter.ai) so emails thread naturally.
// Skip rules and timing are enforced by the cron, not these functions.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailShell(opts: {
  bodyHtml: string
  unsubscribeUrl: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1b2e;font-family:Georgia,serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#d4aa5a;margin:0 0 8px;">SantasLetter.ai</p>
      <p style="font-size:13px;color:rgba(245,234,216,0.5);margin:0;font-style:italic;">A note from the North Pole</p>
    </div>

    <!-- Body card -->
    <div style="background:linear-gradient(175deg,#fffef5 0%,#fdf8e8 100%);border-radius:4px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.4);">
      <div style="height:6px;background:linear-gradient(90deg,#5a0a0a,#c8382b 30%,#d4aa5a 50%,#c8382b 70%,#5a0a0a);"></div>
      <div style="padding:40px 44px;">
        ${opts.bodyHtml}
      </div>
    </div>

    <p style="text-align:center;margin-top:24px;font-size:11px;color:rgba(245,234,216,0.25);">
      SantasLetter.ai · Made with ❤ in San Francisco<br>
      <a href="${opts.unsubscribeUrl}" style="color:rgba(245,234,216,0.3);">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;line-height:1.85;color:#1a0a02;font-size:16px;font-family:Georgia,serif;">${text}</p>`
}

function signature(closing: string): string {
  return `<div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(139,90,43,0.12);">
    <p style="font-size:14px;color:rgba(44,21,8,0.6);margin:0 0 6px;font-style:italic;">${closing}</p>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:38px;color:#7B1010;margin:0;line-height:1.1;">Santa Claus</p>
  </div>`
}

function ps(text: string): string {
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px dashed rgba(139,90,43,0.15);">
    <p style="margin:0;line-height:1.75;color:#1a0a02;font-size:14px;font-family:Georgia,serif;font-style:italic;">
      <strong>P.S.</strong> ${text}
    </p>
  </div>`
}

function ctaButtonPrimary(url: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#c8382b,#9b1f1f);color:#fff;padding:13px 32px;border-radius:4px;text-decoration:none;font-family:Georgia,serif;font-size:15px;">
      ${label}
    </a>
  </div>`
}

function ctaButtonSoft(url: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:transparent;color:#7B1010;padding:12px 32px;border:1px solid rgba(123,16,16,0.4);border-radius:4px;text-decoration:none;font-family:Georgia,serif;font-size:15px;">
      ${label}
    </a>
  </div>`
}

function buildUpgradeUrl(upgradeToken: string | undefined): string {
  return upgradeToken
    ? `https://santasletter.ai/upgrade/${upgradeToken}`
    : 'https://santasletter.ai/create'
}

/**
 * Email 2 — Day 3 — Mrs. Claus character piece.
 * No CTA. Builds emotional investment and gives the parent a small ritual hook.
 */
export async function sendMrsClausEmail(letter: StoredLetter): Promise<void> {
  if (!letter.email || !letter.email.includes('@')) {
    throw new Error(`sendMrsClausEmail: invalid email: ${letter.email}`)
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const childName = escapeHtml(letter.child.name)
  const unsubscribeUrl = generateUnsubscribeUrl(letter.email)

  const body = `
    ${paragraph('Dear friend,')}
    ${paragraph(`After I sent ${childName}'s letter last week, I went home to the warmth of the workshop kitchen and read it to Mrs. Claus over a cup of tea. She listens to all of them.`)}
    ${paragraph('She had something to say about it, the way she always does, and I thought you might like to hear it.')}
    ${paragraph(`Mrs. Claus told me — and she's right, she usually is — that the best letters from the North Pole aren't the ones I write. They're the ones parents read aloud at bedtime, or pin to the fridge, or tuck into a child's pocket on a hard day. The letter is just paper. The reading of it is the magic.`)}
    ${paragraph(`So if you've shared ${childName}'s letter with them already, you've done the real work. And if you haven't yet, there's still time. Christmas hasn't even arrived.`)}
    ${paragraph('Mrs. Claus sends her love. The elves do too.')}
    ${signature('Yours always,')}
    ${ps(`Mrs. Claus said one more thing, and I'll share it: the children who get letters from Santa often write back. She finds those replies in the post and reads them at the kitchen table. It's her favorite part of the year.`)}
  `

  const result = await resend.emails.send({
    from: 'Santa Claus <santa@santasletter.ai>',
    to: letter.email,
    subject: `I told Mrs. Claus about ${letter.child.name}`,
    html: emailShell({ bodyHtml: body, unsubscribeUrl }),
  })

  if (result.error) {
    console.error('Resend sendMrsClausEmail failed:', result.error)
    throw new Error(`Resend error in sendMrsClausEmail: ${result.error.message}`)
  }
}

/**
 * Email 3 — Day 7 — Premium PDF upgrade push.
 * Single CTA, value framing (not social proof), respectful tone.
 */
export async function sendKeepsakeUpgradeEmail(letter: StoredLetter): Promise<void> {
  if (!letter.email || !letter.email.includes('@')) {
    throw new Error(`sendKeepsakeUpgradeEmail: invalid email: ${letter.email}`)
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const childName = escapeHtml(letter.child.name)
  const unsubscribeUrl = generateUnsubscribeUrl(letter.email)
  const upgradeUrl = buildUpgradeUrl(letter.upgradeToken)

  const body = `
    ${paragraph('Dear friend,')}
    ${paragraph(`It's been a week since ${childName}'s letter arrived at your house. I hope it brought a little magic with it.`)}
    ${paragraph('I wanted to mention one thing.')}
    ${paragraph(`Every year, I send out letters to children all over the world. Some are written to be read, smiled at, and remembered. Others are made to be kept — printed on heavy paper, framed, placed in a memory box, pulled out and read again on cold December evenings for years to come.`)}
    ${paragraph(`The letter I wrote for ${childName} is the same words either way. But the keepsake version is something a little different — printed in the official North Pole style, with gold borders and hand-script lettering, the kind of thing that looks at home on a child's wall or tucked inside a Christmas Eve gift.`)}
    ${paragraph(`If you'd like to see what it looks like, here's the link:`)}
    ${ctaButtonPrimary(upgradeUrl, '✦ See the keepsake version')}
    ${paragraph('No rush, no pressure. The free letter is yours forever, and so is my love for your family.')}
    ${signature('Yours,')}
    ${ps(`There's something special about letters that get kept. One day your child may show their own little ones what Santa wrote about them.`)}
  `

  const result = await resend.emails.send({
    from: 'Santa Claus <santa@santasletter.ai>',
    to: letter.email,
    subject: `About ${letter.child.name}'s letter...`,
    html: emailShell({ bodyHtml: body, unsubscribeUrl }),
  })

  if (result.error) {
    console.error('Resend sendKeepsakeUpgradeEmail failed:', result.error)
    throw new Error(`Resend error in sendKeepsakeUpgradeEmail: ${result.error.message}`)
  }
}

/**
 * Email 4 — Day 14 — Soft physical mail intro.
 * Soft CTA, no urgency, last touch before the parent goes cold.
 */
export async function sendPhysicalMailPreviewEmail(letter: StoredLetter): Promise<void> {
  if (!letter.email || !letter.email.includes('@')) {
    throw new Error(`sendPhysicalMailPreviewEmail: invalid email: ${letter.email}`)
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const childName = escapeHtml(letter.child.name)
  const unsubscribeUrl = generateUnsubscribeUrl(letter.email)
  const upgradeUrl = buildUpgradeUrl(letter.upgradeToken)

  const body = `
    ${paragraph('Dear friend,')}
    ${paragraph(`It's been two weeks since ${childName}'s letter arrived. The workshop has been quiet, the elves are at their benches, and the air smells of pine and woodsmoke. We're getting closer.`)}
    ${paragraph('I wanted to share one thing for later.')}
    ${paragraph(`In November and December, when Christmas is properly close, I send real letters by post. Hand-stamped, addressed in the old way, dropped into the mail so they arrive in your mailbox the way they did when you were small.`)}
    ${paragraph(`The same letter I wrote for ${childName} — but the kind that arrives with a postmark and a North Pole stamp. The kind a child finds, runs to the kitchen with, and reads at the breakfast table.`)}
    ${paragraph(`If you'd like one this year, the link will be open when November comes. You can save it now:`)}
    ${ctaButtonSoft(upgradeUrl, 'Save for later →')}
    ${paragraph('No need to act on it today. I just wanted you to have it.')}
    ${paragraph('Christmas is coming. Mrs. Claus is already counting cookies.')}
    ${signature('With love,')}
    ${ps(`${childName}'s free letter is yours to keep, whether you do anything else or not. The rest is for if you want it.`)}
  `

  const result = await resend.emails.send({
    from: 'Santa Claus <santa@santasletter.ai>',
    to: letter.email,
    subject: `One more thing about ${letter.child.name}'s letter`,
    html: emailShell({ bodyHtml: body, unsubscribeUrl }),
  })

  if (result.error) {
    console.error('Resend sendPhysicalMailPreviewEmail failed:', result.error)
    throw new Error(`Resend error in sendPhysicalMailPreviewEmail: ${result.error.message}`)
  }
}