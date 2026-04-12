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

function holly(): string {
  return (
    '<span style="display:inline-flex;align-items:center;gap:2px;">' +
      '<span style="width:14px;height:9px;background:#2d6a2d;border-radius:50% 0 50% 0;display:inline-block;transform:rotate(-15deg);"></span>' +
      '<span style="width:12px;height:8px;background:#2d6a2d;border-radius:0 50% 0 50%;display:inline-block;transform:rotate(15deg);"></span>' +
      '<span style="width:9px;height:9px;background:#c8382b;border-radius:50%;display:inline-block;margin-left:1px;"></span>' +
      '<span style="width:7px;height:7px;background:#c8382b;border-radius:50%;display:inline-block;"></span>' +
    '</span>'
  )
}

function buildLetterHtml(child: ChildInfo, letterText: string, toAddress: MailAddress): string {
  const paragraphs = letterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => '<p>' + p.replace(/\*/g, '') + '</p>')
    .join('')

  const css = [
    '@import url(https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;1,400&family=Dancing+Script:wght@700&display=swap);',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body { font-family: Lora, Georgia, serif; background: #f5edd6; color: #2c1a0e; width: 8.5in; }',

    // PAGE 1
    '.page1 { width: 8.5in; height: 11in; overflow: hidden; position: relative; background: #f5edd6; page-break-after: always; }',
    '.page1-top-bar { height: 5px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',
    '.page1-window-zone { height: 4.5in; }',
    '.page1-content { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 1in; text-align: center; height: 5.5in; }',
    '.cover-office { font-family: "Playfair Display", Georgia, serif; font-size: 26px; color: #6B0F0F; font-weight: 400; letter-spacing: 0.04em; margin-bottom: 6px; }',
    '.cover-sub { font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(44,26,14,0.4); margin-bottom: 20px; }',
    '.cover-recipient { font-family: "Dancing Script", cursive; font-size: 22px; color: #2c1a0e; margin-bottom: 10px; }',
    '.cover-note { font-size: 11px; color: rgba(44,26,14,0.5); line-height: 1.7; font-style: italic; }',
    '.page1-bottom { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; }',
    '.page1-footer-text { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(44,26,14,0.28); padding: 8px; }',
    '.bottom-bar { height: 5px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',

    // PAGE 2
    '.page2 { width: 8.5in; height: 11in; overflow: hidden; position: relative; background: #f5edd6; border: 8px solid #d4aa5a; }',

    // Header
    '.p2-header { background: #6B0F0F; padding: 16px 40px 14px; text-align: center; border-bottom: 3px solid #d4aa5a; }',
    '.p2-header-eyebrow { font-family: "Dancing Script", cursive; font-size: 13px; color: rgba(212,170,90,0.85); margin-bottom: 2px; }',
    '.p2-header-title { font-family: "Dancing Script", cursive; font-size: 50px; color: #d4aa5a; line-height: 1.1; }',

    // Holly + salutation row
    '.holly-salutation-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 36px 0; }',
    '.holly-left { display: flex; align-items: center; }',
    '.holly-right { display: flex; align-items: center; }',

    // Salutation + postmark row
    '.salutation-postmark-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 4px 36px 0; }',
    '.p2-salutation { font-family: "Dancing Script", cursive; font-size: 36px; color: #8B1A1A; line-height: 1.1; }',

    // Postmark — small, right side only
    '.p2-postmark { border: 1.5px dashed #8B1A1A; border-radius: 4px; padding: 5px 10px; text-align: center; width: 110px; flex-shrink: 0; }',
    '.p2-postmark-inner { border: 1px solid #8B1A1A; border-radius: 50%; padding: 3px 6px; font-size: 8.5px; font-style: italic; color: #8B1A1A; margin-bottom: 3px; }',
    '.p2-postmark-date { font-size: 8px; color: #8B1A1A; }',
    '.p2-date-full { font-size: 10.5px; color: rgba(44,26,14,0.55); font-style: italic; padding: 4px 36px 0; }',

    // Divider
    '.p2-divider { border: none; border-top: 1px solid rgba(139,90,43,0.3); margin: 8px 36px 10px; }',

    // Body
    '.p2-body { padding: 0 36px; }',
    'p { font-size: 11px; line-height: 1.78; margin-bottom: 8px; color: #2a1508; font-style: italic; text-indent: 1.5em; }',

    // Sign off
    '.p2-signoff-wrap { margin: 0 36px; padding-top: 10px; border-top: 1px solid rgba(139,90,43,0.2); }',
    '.p2-signoff-text { font-size: 10.5px; font-style: italic; color: rgba(44,26,14,0.55); margin-bottom: 2px; }',
    '.p2-signature { font-family: "Dancing Script", cursive; font-size: 42px; color: #8B1A1A; line-height: 1.1; }',
    '.p2-sig-divider { border: none; border-top: 1px solid rgba(139,90,43,0.25); margin: 4px 0 4px; width: 260px; }',
    '.p2-sig-titles { font-size: 9px; font-style: italic; color: rgba(44,26,14,0.5); margin-bottom: 1px; }',
    '.p2-sig-role { font-size: 9px; font-style: italic; color: rgba(44,26,14,0.45); }',

    // Footer zone — postmarked left, nice list right
    '.p2-footer-zone { position: absolute; bottom: 38px; left: 36px; right: 36px; display: flex; justify-content: space-between; align-items: flex-end; }',
    '.p2-postmarked { border: 1px solid rgba(139,90,43,0.5); border-radius: 3px; padding: 4px 12px; font-size: 9px; font-style: italic; color: rgba(44,26,14,0.5); display: inline-block; }',
    '.p2-nice-list { border: 2px solid #2d6a2d; padding: 4px 10px; text-align: center; transform: rotate(-4deg); display: inline-block; }',
    '.p2-nice-list-text { font-size: 8px; letter-spacing: 0.15em; font-weight: bold; color: #2d6a2d; line-height: 1.6; }',

    // Bottom bar
    '.p2-bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; }',
    '.p2-footer-text { background: #6B0F0F; text-align: center; padding: 7px; font-size: 8px; font-style: italic; color: #d4aa5a; letter-spacing: 0.08em; }',
  ].join(' ')

  const year = new Date().getFullYear()

  const page1 =
    '<div class="page1">' +
      '<div class="page1-top-bar"></div>' +
      '<div class="page1-window-zone"></div>' +
      '<div class="page1-content">' +
        '<div class="cover-office">The North Pole Post Office</div>' +
        '<div class="cover-sub">Official North Pole Correspondence · Est. CCLXXX A.D.</div>' +
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
      '<div class="p2-header">' +
        '<div class="p2-header-eyebrow">From the Desk of</div>' +
        '<div class="p2-header-title">Santa Claus</div>' +
      '</div>' +

      '<div class="holly-salutation-row">' +
        '<div class="holly-left">' + holly() + '</div>' +
        '<div class="holly-right">' + holly() + '</div>' +
      '</div>' +

      '<div class="salutation-postmark-row">' +
        '<div class="p2-salutation">Dear ' + child.name + ',</div>' +
        '<div class="p2-postmark">' +
          '<div class="p2-postmark-inner">North Pole<br>Post Office</div>' +
          '<div class="p2-postmark-date">Dec 25 · ' + year + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="p2-date-full">25th December, ' + year + '</div>' +
      '<hr class="p2-divider" />' +
      '<div class="p2-body">' + paragraphs + '</div>' +

      '<div class="p2-signoff-wrap">' +
        '<div class="p2-signoff-text">With all the love and magic of Christmas,</div>' +
        '<div class="p2-signature">Santa Claus</div>' +
        '<div class="p2-sig-divider"></div>' +
        '<div class="p2-sig-titles">Kris Kringle — Father Christmas — St. Nicholas</div>' +
        '<div class="p2-sig-role">Chief Correspondent, North Pole Post Office</div>' +
      '</div>' +

      '<div class="p2-footer-zone">' +
        '<div class="p2-postmarked">Postmarked · North Pole · ' + year + '</div>' +
        '<div class="p2-nice-list"><div class="p2-nice-list-text">NICE LIST<br>APPROVED</div></div>' +
      '</div>' +

      '<div class="p2-bottom-bar">' +
        '<div class="p2-footer-text">SantasLetter.ai &#9733; Official Correspondence of the North Pole Post Office &#9733; Est. CCLXXX A.D.</div>' +
      '</div>' +
    '</div>'

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    page1 + page2 +
    '</body></html>'
}