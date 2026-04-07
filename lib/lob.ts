import { ChildInfo } from '@/types'

const LOB_API_URL = 'https://api.lob.com/v1'

interface MailAddress {
  name: string
  address_line1: string
  address_line2?: string
  address_city: string
  address_state: string
  address_zip: string
  address_country: string
}

export async function sendPhysicalLetter(
  toAddress: MailAddress,
  child: ChildInfo,
  letter: { content: string; childName: string; createdAt: string }
): Promise<{ id: string; expectedDelivery: string }> {
  const auth = Buffer.from(`${process.env.LOB_API_KEY}:`).toString('base64')
  const html = buildLetterHtml(child, letter.content)

  const response = await fetch(`${LOB_API_URL}/letters`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: `Santa's letter for ${child.name}`,
      to: toAddress,
      from: {
        name: 'Santa Claus',
        address_line1: '1 North Pole Way',
        address_city: 'North Pole',
        address_state: 'AK',
        address_zip: '99705',
        address_country: 'US',
      },
      file: html,
      color: true,
      double_sided: false,
      mail_type: 'usps_first_class',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Lob API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return { id: data.id, expectedDelivery: data.expected_delivery_date }
}

function buildLetterHtml(child: ChildInfo, letterText: string): string {
  const paragraphs = letterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\*/g, '')}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; background: #fdf6e8; color: #2c1a0e; padding: 72px 80px; }
  p { font-size: 14px; line-height: 1.85; margin-bottom: 20px; }
  .header { text-align: center; margin-bottom: 40px; }
  .title { font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(44,26,14,0.6); }
  .salutation { font-size: 22px; margin-bottom: 20px; }
  .signature { font-style: italic; font-size: 36px; color: #8B1A1A; margin-top: 24px; }
</style>
</head>
<body>
  <div class="header">
    <div class="title">The Official North Pole Post Office</div>
    <div style="font-size:10px;letter-spacing:0.15em;color:rgba(44,26,14,0.4);margin-top:6px;">Est. Anno Domini CCLXXX</div>
  </div>
  <div class="salutation">Dear ${child.name},</div>
  <hr style="border:none;border-top:1px solid rgba(44,26,14,0.15);margin-bottom:24px;">
  ${paragraphs}
  <div style="margin-top:32px;">
    <div style="font-size:13px;font-style:italic;color:rgba(44,26,14,0.6);margin-bottom:8px;">With all the love and magic of Christmas,</div>
    <div class="signature">Santa Claus</div>
  </div>
</body>
</html>`
}