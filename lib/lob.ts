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
  const html = buildLetterHtml(child, letter.content, toAddress)

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
        name: 'Santa Claus — North Pole Post Office',
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
      use_type: 'operational',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Lob API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return { id: data.id, expectedDelivery: data.expected_delivery_date }
}

function buildLetterHtml(child: ChildInfo, letterText: string, toAddress: MailAddress): string {
  const paragraphs = letterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => '<p>' + p.replace(/\*/g, '') + '</p>')
    .join('')

  const css = [
    '@import url(https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;1,400&display=swap);',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body { font-family: Lora, Georgia, serif; background: #fdf6e3; color: #2c1a0e; width: 8.5in; }',

    // Page 1 — address/cover page
    '.page1 { width: 8.5in; height: 11in; overflow: hidden; position: relative; background: #fdf6e3; page-break-after: always; }',
    '.page1-top-bar { height: 5px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',
    // Lob window zone — top 4.75in x 4in from left, we leave blank for address
    '.page1-window-zone { height: 4.5in; width: 4.25in; }',
    '.page1-content { position: absolute; top: 5in; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 1in; text-align: center; }',
    '.seal { font-size: 64px; line-height: 1; margin-bottom: 20px; }',
    '.cover-title { font-family: "Playfair Display", Georgia, serif; font-size: 28px; color: #6B0F0F; font-weight: 400; letter-spacing: 0.05em; margin-bottom: 8px; }',
    '.cover-subtitle { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(44,26,14,0.4); margin-bottom: 24px; }',
    '.cover-recipient { font-family: "Playfair Display", Georgia, serif; font-style: italic; font-size: 18px; color: #2c1a0e; }',
    '.cover-note { font-size: 11px; color: rgba(44,26,14,0.5); margin-top: 12px; line-height: 1.6; }',
    '.page1-bottom { position: absolute; bottom: 0; left: 0; right: 0; }',
    '.page1-footer-text { text-align: center; font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(44,26,14,0.28); padding: 8px; }',

    // Page 2 — the letter
    '.page2 { width: 8.5in; height: 11in; overflow: hidden; position: relative; background: #fdf6e3; }',
    '.top-bar { height: 5px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',
    '.header { text-align: center; padding: 20px 52px 16px; border-bottom: 0.5px solid rgba(139,90,43,0.12); }',
    '.north-pole-label { font-size: 8px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(44,26,14,0.4); margin-bottom: 4px; }',
    '.office-title { font-family: "Playfair Display", Georgia, serif; font-size: 20px; color: #6B0F0F; font-weight: 400; letter-spacing: 0.05em; }',
    '.office-subtitle { font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(44,26,14,0.35); margin-top: 3px; }',
    '.body { padding: 18px 60px 60px; }',
    '.salutation { font-family: "Playfair Display", Georgia, serif; font-size: 21px; color: #150800; margin-bottom: 12px; }',
    '.divider { border: none; border-top: 0.5px solid rgba(139,90,43,0.15); margin-bottom: 14px; }',
    'p { font-size: 12.5px; line-height: 1.8; margin-bottom: 11px; color: #2a1508; }',
    '.sign-off { margin-top: 14px; padding-top: 12px; border-top: 0.5px solid rgba(139,90,43,0.12); }',
    '.sign-off-text { font-size: 11px; font-style: italic; color: rgba(44,26,14,0.55); margin-bottom: 5px; }',
    '.signature { font-family: "Playfair Display", Georgia, serif; font-style: italic; font-size: 32px; color: #7B1010; line-height: 1.1; }',
    '.signature-title { font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(44,26,14,0.35); margin-top: 5px; }',
    '.page2-bottom { position: absolute; bottom: 0; left: 0; right: 0; }',
    '.footer-text { text-align: center; font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(44,26,14,0.28); padding: 8px; }',
    '.bottom-bar { height: 4px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',
  ].join(' ')

  const page1 =
    '<div class="page1">' +
      '<div class="page1-top-bar"></div>' +
      '<div class="page1-window-zone"></div>' +
      '<div class="page1-content">' +
        '<div class="seal">🎅</div>' +
        '<div class="cover-title">The North Pole Post Office</div>' +
        '<div class="cover-subtitle">Official North Pole Correspondence · Est. CCLXXX A.D.</div>' +
        '<div class="cover-recipient">A personal letter for ' + child.name + '</div>' +
        '<div class="cover-note">This correspondence has been prepared especially<br>by Santa Claus and delivered with Christmas magic.</div>' +
      '</div>' +
      '<div class="page1-bottom">' +
        '<div class="page1-footer-text">SantasLetter.ai · Official North Pole Post Office</div>' +
        '<div class="bottom-bar"></div>' +
      '</div>' +
    '</div>'

  const page2 =
    '<div class="page2">' +
      '<div class="top-bar"></div>' +
      '<div class="header">' +
        '<div class="north-pole-label">Official North Pole Correspondence</div>' +
        '<div class="office-title">The North Pole Post Office</div>' +
        '<div class="office-subtitle">Est. Anno Domini CCLXXX · Delivering Magic Since 280 AD</div>' +
      '</div>' +
      '<div class="body">' +
        '<div class="salutation">Dear ' + child.name + ',</div>' +
        '<hr class="divider" />' +
        paragraphs +
        '<div class="sign-off">' +
          '<div class="sign-off-text">With all the love and magic of Christmas,</div>' +
          '<div class="signature">Santa Claus</div>' +
          '<div class="signature-title">Father Christmas · St. Nicholas · Kris Kringle</div>' +
        '</div>' +
      '</div>' +
      '<div class="page2-bottom">' +
        '<div class="footer-text">SantasLetter.ai · Official North Pole Post Office · santasletter.ai</div>' +
        '<div class="bottom-bar"></div>' +
      '</div>' +
    '</div>'

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    page1 + page2 +
    '</body></html>'
}