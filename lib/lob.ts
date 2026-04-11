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

function buildLetterHtml(child: ChildInfo, letterText: string): string {
  const paragraphs = letterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => '<p>' + p.replace(/\*/g, '') + '</p>')
    .join('')

  const css = [
    '@import url(https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;1,400&display=swap);',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body { font-family: Lora, Georgia, serif; background: #fdf6e3; color: #2c1a0e; width: 8.5in; min-height: 11in; padding: 0.85in 0.9in; }',
    '.top-bar { height: 6px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); margin-bottom: 32px; margin-left: -0.9in; margin-right: -0.9in; }',
    '.header { text-align: center; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 1px solid rgba(139,90,43,0.2); }',
    '.north-pole-label { font-size: 8px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(44,26,14,0.45); font-family: Georgia, serif; margin-bottom: 10px; }',
    '.seal { font-size: 48px; line-height: 1; margin-bottom: 10px; }',
    '.office-title { font-family: "Playfair Display", Georgia, serif; font-size: 20px; color: #6B0F0F; font-weight: 400; letter-spacing: 0.06em; margin-bottom: 4px; }',
    '.office-subtitle { font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(44,26,14,0.4); }',
    '.salutation { font-family: "Playfair Display", Georgia, serif; font-size: 22px; color: #150800; margin-bottom: 20px; }',
    '.divider { border: none; border-top: 1px solid rgba(139,90,43,0.15); margin-bottom: 22px; }',
    'p { font-size: 13.5px; line-height: 1.9; margin-bottom: 18px; color: #2a1508; }',
    '.sign-off { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(139,90,43,0.12); }',
    '.sign-off-text { font-size: 12px; font-style: italic; color: rgba(44,26,14,0.55); margin-bottom: 10px; }',
    '.signature { font-family: "Playfair Display", Georgia, serif; font-style: italic; font-size: 36px; color: #7B1010; line-height: 1.2; }',
    '.signature-title { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(44,26,14,0.4); margin-top: 6px; }',
    '.footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid rgba(139,90,43,0.12); text-align: center; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(44,26,14,0.3); }',
    '.bottom-bar { height: 4px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); position: fixed; bottom: 0; left: 0; right: 0; }',
  ].join(' ')

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    '<div class="top-bar"></div>' +
    '<div class="header">' +
      '<div class="north-pole-label">Official North Pole Correspondence</div>' +
      '<div class="seal">🎅</div>' +
      '<div class="office-title">The North Pole Post Office</div>' +
      '<div class="office-subtitle">Est. Anno Domini CCLXXX · Delivering Magic Since 280 AD</div>' +
    '</div>' +
    '<div class="salutation">Dear ' + child.name + ',</div>' +
    '<hr class="divider" />' +
    paragraphs +
    '<div class="sign-off">' +
      '<div class="sign-off-text">With all the love and magic of Christmas,</div>' +
      '<div class="signature">Santa Claus</div>' +
      '<div class="signature-title">Father Christmas · St. Nicholas · Kris Kringle</div>' +
    '</div>' +
    '<div class="footer">SantasLetter.ai · Official North Pole Post Office · santasletter.ai</div>' +
    '<div class="bottom-bar"></div>' +
    '</body></html>'
}