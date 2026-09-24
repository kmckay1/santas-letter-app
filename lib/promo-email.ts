import { generateUnsubscribeUrl, unsubscribeHeaders } from './unsubscribe'
import { footerHtml } from './email-footer'

// One-shot promotional email, sent by /api/admin/send-promo.
//
// This is marketing, so it only ever goes to people who opted in (see the
// route for how the list is built) and always carries the postal address, an
// unsubscribe link and the RFC 8058 one-click headers.
//
// DRAFT COPY: review it in the route's dry run before the first send.

export interface PromoRecipient {
  email: string
  // From the recipient's most recent letter. Subscribers who never created a
  // letter have neither, and get the generic version.
  childName?: string | null
  upgradeToken?: string | null
}

export interface RenderedPromo {
  to: string
  subject: string
  headers: Record<string, string>
  html: string
}

const SITE = 'https://www.santasletter.ai'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;line-height:1.85;color:#1a0a02;font-size:16px;font-family:Georgia,serif;">${text}</p>`
}

function button(url: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#c8382b,#9b1f1f);color:#fff;padding:13px 32px;border-radius:4px;text-decoration:none;font-family:Georgia,serif;font-size:15px;">${label}</a>
  </div>`
}

function signature(): string {
  return `<div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(139,90,43,0.12);">
    <p style="font-size:14px;color:rgba(44,21,8,0.6);margin:0 0 6px;font-style:italic;">With love,</p>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:38px;color:#7B1010;margin:0;line-height:1.1;">Santa Claus</p>
  </div>`
}

function shell(bodyHtml: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1b2e;font-family:Georgia,serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#d4aa5a;margin:0 0 8px;">SantasLetter.ai</p>
      <p style="font-size:13px;color:rgba(245,234,216,0.5);margin:0;font-style:italic;">A note from the North Pole</p>
    </div>
    <div style="background:linear-gradient(175deg,#fffef5 0%,#fdf8e8 100%);border-radius:4px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.4);">
      <div style="height:6px;background:linear-gradient(90deg,#5a0a0a,#c8382b 30%,#d4aa5a 50%,#c8382b 70%,#5a0a0a);"></div>
      <div style="padding:40px 44px;">
        ${bodyHtml}
      </div>
    </div>
    ${footerHtml(unsubscribeUrl)}
  </div>
</body>
</html>`
}

export function renderPromoEmail(recipient: PromoRecipient): RenderedPromo {
  const unsubscribeUrl = generateUnsubscribeUrl(recipient.email)
  const rawName = recipient.childName?.trim()

  let subject: string
  let body: string

  if (rawName) {
    // Someone who has already written a letter: offer the posted version of it.
    const childName = escapeHtml(rawName)
    const url = recipient.upgradeToken
      ? `${SITE}/upgrade/${encodeURIComponent(recipient.upgradeToken)}`
      : `${SITE}/create`
    subject = `${rawName}'s letter from Santa can arrive by post this December`
    body = `
      ${paragraph('Dear friend,')}
      ${paragraph(`You created a letter for ${childName} earlier this year, and it's not too late to have it arrive by post this Christmas.`)}
      ${paragraph(`It would be the same letter I wrote for ${childName}, printed and mailed so it arrives at your door the way a letter from the North Pole should.`)}
      ${paragraph('Letters go out from November 22, on the posting date you choose, so there is still plenty of time. There is also a printable keepsake version if you would like a copy to frame.')}
      ${button(url, '✦ See the posted letter')}
      ${signature()}
    `
  } else {
    // A subscriber with no letter yet: invite them to write one.
    subject = 'Your child\'s free letter from Santa'
    body = `
      ${paragraph('Dear friend,')}
      ${paragraph('Thank you for joining us at the North Pole this year.')}
      ${paragraph('I am writing personal letters to children again this Christmas, each one with their own name, their wishes and the good things they have done. You can create your child\'s letter for free in a couple of minutes.')}
      ${paragraph('Posted letters are an optional upgrade, going out from November 22 on the date you choose.')}
      ${button(`${SITE}/create`, '✦ Write your child\'s free letter')}
      ${signature()}
    `
  }

  return {
    to: recipient.email,
    subject,
    headers: unsubscribeHeaders(recipient.email),
    html: shell(body, unsubscribeUrl),
  }
}
