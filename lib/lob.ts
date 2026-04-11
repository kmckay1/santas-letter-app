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
    'html, body { width: 8.5in; height: 11in; overflow: hidden; }',
    'body { font-family: Lora, Georgia, serif; background: #fdf6e3; color: #2c1a0e; padding: 0; }',
    // Top bar
    '.top-bar { height: 5px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',
    // Address zone — Lob requires top-left, we style it to look intentional
    '.address-zone { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 48px 14px; border-bottom: 1px solid rgba(139,90,43,0.15); background: #fdf6e3; }',
    '.from-block { font-size: 7px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(44,26,14,0.4); line-height: 1.7; }',
    '.to-block { text-align: right; font-size: 8px; color: rgba(44,26,14,0.55); line-height: 1.7; font-style: italic; }',
    '.to-block strong { font-style: normal; font-size: 9px; color: rgba(44,26,14,0.75); display: block; margin-bottom: 2px; }',
    // Header
    '.header { text-align: center; padding: 14px 48px 12px; border-bottom: 1px solid rgba(139,90,43,0.12); }',
    '.north-pole-label { font-size: 7px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(44,26,14,0.4); margin-bottom: 3px; }',
    '.office-title { font-family: "Playfair Display", Georgia, serif; font-size: 17px; color: #6B0F0F; font-weight: 400; letter-spacing: 0.05em; }',
    '.office-subtitle { font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(44,26,14,0.35); margin-top: 2px; }',
    // Body
    '.body { padding: 16px 52px 12px; }',
    '.salutation { font-family: "Playfair Display", Georgia, serif; font-size: 19px; color: #150800; margin-bottom: 10px; }',
    '.divider { border: none; border-top: 1px solid rgba(139,90,43,0.15); margin-bottom: 12px; }',
    'p { font-size: 12px; line-height: 1.75; margin-bottom: 10px; color: #2a1508; }',
    '.sign-off { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(139,90,43,0.12); }',
    '.sign-off-text { font-size: 11px; font-style: italic; color: rgba(44,26,14,0.55); margin-bottom: 4px; }',
    '.signature { font-family: "Playfair Display", Georgia, serif; font-style: italic; font-size: 30px; color: #7B1010; line-height: 1.1; }',
    '.signature-title { font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(44,26,14,0.35); margin-top: 4px; }',
    // Footer
    '.footer { position: absolute; bottom: 0; left: 0; right: 0; }',
    '.footer-text { text-align: center; font-size: 7.5px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(44,26,14,0.3); padding: 8px; }',
    '.bottom-bar { height: 4px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',
  ].join(' ')

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    '<div class="top-bar"></div>' +
    '<div class="address-zone">' +
      '<div class="from-block">' +
        'Santa Claus<br>North Pole Post Office<br>1 North Pole Way<br>North Pole, AK 99705' +
      '</div>' +
      '<div class="to-block">' +
        '<strong>' + toAddress.name + '</strong>' +
        toAddress.address_line1 + '<br>' +
        (toAddress.address_line2 ? toAddress.address_line2 + '<br>' : '') +
        toAddress.address_city + ', ' + toAddress.address_state + ' ' + toAddress.address_zip +
      '</div>' +
    '</div>' +
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
    '<div class="footer">' +
      '<div class="footer-text">SantasLetter.ai · Official North Pole Post Office · santasletter.ai</div>' +
      '<div class="bottom-bar"></div>' +
    '</div>' +
    '</body></html>'
}