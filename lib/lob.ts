import { ChildInfo } from '@/types'
import { createClient } from '@supabase/supabase-js'

const LOB_API_URL = 'https://api.lob.com/v1'

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface MailAddress {
  name: string
  address_line1: string
  address_line2?: string
  address_city: string
  address_state: string
  address_zip: string
  address_country: string
}

async function uploadHtmlToSupabase(html: string, fileName: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const buffer = Buffer.from(html, 'utf-8')
  const { error } = await supabase.storage
    .from('lob-letters')
    .upload(fileName, buffer, { contentType: 'text/html', upsert: true })
  if (error) throw new Error('Supabase upload error: ' + error.message)
  const { data } = supabase.storage.from('lob-letters').getPublicUrl(fileName)
  return data.publicUrl
}

export async function sendPhysicalLetter(
  toAddress: MailAddress,
  child: ChildInfo,
  letter: { content: string; childName: string; createdAt: string }
): Promise<{ id: string; expectedDelivery: string }> {
  const auth = Buffer.from(`${process.env.LOB_API_KEY}:`).toString('base64')
  const html = buildLetterHtml(child, letter.content, toAddress)
  const fileName = 'letter-' + child.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '.html'
  const fileUrl = await uploadHtmlToSupabase(html, fileName)

  const response = await fetch(`${LOB_API_URL}/letters`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
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
      file: fileUrl,
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

  const year = new Date().getFullYear()

  const css = [
    '@import url(https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;1,400&family=Dancing+Script:wght@700&display=swap);',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body { font-family: Lora, Georgia, serif; background: #e8dcc0; color: #2c1a0e; width: 8.5in; }',

    // PAGE 1
    '.page1 { width: 8.5in; height: 11in; overflow: hidden; position: relative; background: #f5edd6; page-break-after: always; }',
    '.page1-top-bar { height: 5px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',
    '.page1-window-zone { height: 4.5in; }',
    '.page1-content { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 1in; text-align: center; height: 5.5in; }',
    '.cover-office { font-family: "Playfair Display", Georgia, serif; font-size: 26px; color: #6B0F0F; font-weight: 400; letter-spacing: 0.04em; margin-bottom: 6px; }',
    '.cover-sub { font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(44,26,14,0.4); margin-bottom: 20px; }',
    '.cover-recipient { font-family: "Dancing Script", cursive; font-size: 24px; color: #2c1a0e; margin-bottom: 10px; }',
    '.cover-note { font-size: 11px; color: rgba(44,26,14,0.5); line-height: 1.7; font-style: italic; }',
    '.page1-bottom { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; }',
    '.page1-footer-text { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(44,26,14,0.28); padding: 8px; }',
    '.page1-bottom-bar { height: 5px; background: linear-gradient(90deg, #6B0F0F, #c8382b 25%, #d4aa5a 50%, #c8382b 75%, #6B0F0F); }',

    // PAGE 2
    '.page2 { width: 8.5in; height: 11in; overflow: hidden; position: relative; background: #fdf6e3; }',

    // Outer gold border
    '.outer-border { position: absolute; inset: 0; border: 8px solid #c8922a; pointer-events: none; }',

    // Corner diamonds
    '.corner { position: absolute; width: 16px; height: 16px; background: #c8922a; transform: rotate(45deg); }',
    '.corner-tl { top: -4px; left: -4px; }',
    '.corner-tr { top: -4px; right: -4px; }',
    '.corner-bl { bottom: -4px; left: -4px; }',
    '.corner-br { bottom: -4px; right: -4px; }',

    // Header
    '.p2-header { background: #6B0F0F; padding: 18px 48px 16px; text-align: center; border-bottom: 3px solid #c8922a; }',
    '.p2-eyebrow { font-family: "Dancing Script", cursive; font-size: 15px; color: rgba(212,170,90,0.88); margin-bottom: 4px; letter-spacing: 0.06em; }',
    '.p2-title { font-family: "Dancing Script", cursive; font-size: 62px; color: #d4aa5a; line-height: 1.05; letter-spacing: 0.02em; }',

    // Inner content
    '.p2-inner { margin: 10px; border: 1px solid rgba(200,146,42,0.35); padding: 20px 36px 90px; height: calc(11in - 140px); position: relative; }',

    // Salutation row
    '.sal-row { display: table; width: 100%; margin-bottom: 8px; }',
    '.sal-left { display: table-cell; vertical-align: middle; }',
    '.sal-right { display: table-cell; vertical-align: top; text-align: right; width: 140px; }',
    '.p2-salutation { font-family: "Dancing Script", cursive; font-size: 38px; color: #7B1010; line-height: 1.1; }',
    '.p2-postmark { border: 1.5px dashed #8B1A1A; border-radius: 4px; padding: 6px 12px; text-align: center; display: inline-block; margin-top: 4px; }',
    '.p2-postmark-inner { border: 1px solid #8B1A1A; border-radius: 50%; padding: 3px 8px; font-size: 9px; font-style: italic; color: #8B1A1A; margin-bottom: 3px; }',
    '.p2-postmark-date { font-size: 8.5px; color: #8B1A1A; }',

    '.p2-date { font-size: 11px; color: rgba(44,26,14,0.5); font-style: italic; margin-bottom: 12px; }',
    '.p2-divider { border: none; border-top: 1px solid rgba(139,90,43,0.25); margin-bottom: 14px; }',

    // Body
    'p { font-size: 12.5px; line-height: 1.85; margin-bottom: 12px; color: #2a1508; font-style: italic; text-indent: 1.5em; }',

    // Ornamental divider
    '.ornament { text-align: center; margin: 14px 0; color: rgba(200,146,42,0.65); font-size: 15px; letter-spacing: 10px; }',

    // Sign off
    '.signoff-text { font-size: 11.5px; font-style: italic; color: rgba(44,26,14,0.5); margin-bottom: 4px; }',
    '.p2-signature { font-family: "Dancing Script", cursive; font-size: 60px; color: #7B1010; line-height: 1.1; margin-bottom: 6px; }',
    '.sig-rule { border: none; border-top: 1px solid rgba(139,90,43,0.3); width: 300px; margin-bottom: 7px; }',
    '.sig-titles { font-size: 10px; font-style: italic; color: rgba(44,26,14,0.45); margin-bottom: 2px; }',
    '.sig-role { font-size: 10px; font-style: italic; color: rgba(44,26,14,0.4); margin-bottom: 12px; }',
    '.postmarked { display: inline-block; border: 1px solid rgba(139,90,43,0.45); border-radius: 3px; padding: 4px 12px; font-size: 9.5px; font-style: italic; color: rgba(44,26,14,0.45); }',

    // Nice List stamp
    '.nice-list { position: absolute; bottom: 52px; right: 44px; transform: rotate(-5deg); }',
    '.nice-list-outer { border: 3px solid #1f5c1f; padding: 2px; }',
    '.nice-list-inner { border: 1.5px solid #1f5c1f; padding: 8px 18px; text-align: center; }',
    '.nice-list-top { font-size: 7px; letter-spacing: 0.22em; color: #1f5c1f; font-weight: bold; margin-bottom: 3px; }',
    '.nice-list-text { font-size: 12px; letter-spacing: 0.18em; color: #1f5c1f; font-weight: bold; line-height: 1.5; }',
    '.nice-list-year { font-size: 7px; letter-spacing: 0.22em; color: #1f5c1f; font-weight: bold; margin-top: 3px; }',

    // Footer
    '.p2-footer { background: #6B0F0F; padding: 8px; text-align: center; }',
    '.p2-footer-text { font-size: 9px; font-style: italic; color: #d4aa5a; letter-spacing: 0.1em; }',
  ].join(' ')

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
        '<div class="page1-bottom-bar"></div>' +
      '</div>' +
    '</div>'

  const page2 =
    '<div class="page2">' +
      '<div class="outer-border"></div>' +
      '<div class="corner corner-tl"></div>' +
      '<div class="corner corner-tr"></div>' +
      '<div class="corner corner-bl"></div>' +
      '<div class="corner corner-br"></div>' +

      '<div class="p2-header">' +
        '<div class="p2-eyebrow">From the Desk of</div>' +
        '<div class="p2-title">Santa Claus</div>' +
      '</div>' +

      '<div class="p2-inner">' +

        '<div class="sal-row">' +
          '<div class="sal-left"><div class="p2-salutation">Dear ' + child.name + ',</div></div>' +
          '<div class="sal-right">' +
            '<div class="p2-postmark">' +
              '<div class="p2-postmark-inner">North Pole<br>Post Office</div>' +
              '<div class="p2-postmark-date">Dec 25 · ' + year + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="p2-date">25th December, ' + year + '</div>' +
        '<hr class="p2-divider" />' +

        paragraphs +

        '<div class="ornament">&#10022; &nbsp; &#10022; &nbsp; &#10022;</div>' +

        '<div class="signoff-text">With all the love and magic of Christmas,</div>' +
        '<div class="p2-signature">Santa Claus</div>' +
        '<hr class="sig-rule" />' +
        '<div class="sig-titles">Kris Kringle &mdash; Father Christmas &mdash; St. Nicholas</div>' +
        '<div class="sig-role">Chief Correspondent, North Pole Post Office</div>' +
        '<div class="postmarked">Postmarked &middot; North Pole &middot; ' + year + '</div>' +

        '<div class="nice-list">' +
          '<div class="nice-list-outer">' +
            '<div class="nice-list-inner">' +
              '<div class="nice-list-top">&#10022; NORTH POLE &#10022;</div>' +
              '<div class="nice-list-text">NICE LIST</div>' +
              '<div class="nice-list-text">APPROVED</div>' +
              '<div class="nice-list-year">&#10022; ' + year + ' &#10022;</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="p2-footer">' +
        '<div class="p2-footer-text">SantasLetter.ai &#9733; Official Correspondence of the North Pole Post Office &#9733; Est. CCLXXX A.D.</div>' +
      '</div>' +
    '</div>'

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    page1 + page2 +
    '</body></html>'
}