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
    .upload(fileName, buffer, {
      contentType: 'text/html',
      upsert: true,
    })

  if (error) throw new Error('Supabase upload error: ' + error.message)

  const { data } = supabase.storage
    .from('lob-letters')
    .getPublicUrl(fileName)

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

// Left holly — berries on right
function hollyLeft(): string {
  return '<svg width="80" height="52" viewBox="0 0 80 52" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
      '<radialGradient id="blA" cx="40%" cy="35%"><stop offset="0%" stop-color="#e05555"/><stop offset="100%" stop-color="#6b0f0f"/></radialGradient>' +
      '<radialGradient id="blB" cx="40%" cy="35%"><stop offset="0%" stop-color="#e05555"/><stop offset="100%" stop-color="#6b0f0f"/></radialGradient>' +
      '<radialGradient id="blC" cx="40%" cy="35%"><stop offset="0%" stop-color="#e87070"/><stop offset="100%" stop-color="#8b1a1a"/></radialGradient>' +
    '</defs>' +
    '<ellipse cx="22" cy="28" rx="18" ry="9" fill="#2d6a2d" transform="rotate(-30 22 28)"/>' +
    '<ellipse cx="22" cy="28" rx="14" ry="5" fill="#3a8a3a" transform="rotate(-30 22 28)"/>' +
    '<ellipse cx="38" cy="32" rx="18" ry="9" fill="#2d6a2d" transform="rotate(15 38 32)"/>' +
    '<ellipse cx="38" cy="32" rx="14" ry="5" fill="#3a8a3a" transform="rotate(15 38 32)"/>' +
    '<ellipse cx="30" cy="22" rx="12" ry="6" fill="#256025" transform="rotate(-55 30 22)"/>' +
    '<line x1="34" y1="26" x2="50" y2="16" stroke="#5a3e1b" stroke-width="1.5"/>' +
    '<line x1="50" y1="16" x2="58" y2="20" stroke="#5a3e1b" stroke-width="1.2"/>' +
    '<line x1="50" y1="16" x2="54" y2="10" stroke="#5a3e1b" stroke-width="1.2"/>' +
    '<circle cx="58" cy="22" r="7" fill="url(#blA)"/>' +
    '<circle cx="54" cy="9" r="6" fill="url(#blB)"/>' +
    '<circle cx="66" cy="14" r="6.5" fill="url(#blC)"/>' +
    '<circle cx="56" cy="20" r="2" fill="rgba(255,255,255,0.35)"/>' +
    '<circle cx="52" cy="7" r="1.8" fill="rgba(255,255,255,0.35)"/>' +
    '<circle cx="64" cy="12" r="1.8" fill="rgba(255,255,255,0.35)"/>' +
  '</svg>'
}

// Right holly — mirror, berries on left
function hollyRight(): string {
  return '<svg width="80" height="52" viewBox="0 0 80 52" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
      '<radialGradient id="brA" cx="40%" cy="35%"><stop offset="0%" stop-color="#e05555"/><stop offset="100%" stop-color="#6b0f0f"/></radialGradient>' +
      '<radialGradient id="brB" cx="40%" cy="35%"><stop offset="0%" stop-color="#e05555"/><stop offset="100%" stop-color="#6b0f0f"/></radialGradient>' +
      '<radialGradient id="brC" cx="40%" cy="35%"><stop offset="0%" stop-color="#e87070"/><stop offset="100%" stop-color="#8b1a1a"/></radialGradient>' +
    '</defs>' +
    // Mirror by flipping x coords: original x -> 80-x
    '<ellipse cx="58" cy="28" rx="18" ry="9" fill="#2d6a2d" transform="rotate(30 58 28)"/>' +
    '<ellipse cx="58" cy="28" rx="14" ry="5" fill="#3a8a3a" transform="rotate(30 58 28)"/>' +
    '<ellipse cx="42" cy="32" rx="18" ry="9" fill="#2d6a2d" transform="rotate(-15 42 32)"/>' +
    '<ellipse cx="42" cy="32" rx="14" ry="5" fill="#3a8a3a" transform="rotate(-15 42 32)"/>' +
    '<ellipse cx="50" cy="22" rx="12" ry="6" fill="#256025" transform="rotate(55 50 22)"/>' +
    '<line x1="46" y1="26" x2="30" y2="16" stroke="#5a3e1b" stroke-width="1.5"/>' +
    '<line x1="30" y1="16" x2="22" y2="20" stroke="#5a3e1b" stroke-width="1.2"/>' +
    '<line x1="30" y1="16" x2="26" y2="10" stroke="#5a3e1b" stroke-width="1.2"/>' +
    '<circle cx="22" cy="22" r="7" fill="url(#brA)"/>' +
    '<circle cx="26" cy="9" r="6" fill="url(#brB)"/>' +
    '<circle cx="14" cy="14" r="6.5" fill="url(#brC)"/>' +
    '<circle cx="24" cy="20" r="2" fill="rgba(255,255,255,0.35)"/>' +
    '<circle cx="28" cy="7" r="1.8" fill="rgba(255,255,255,0.35)"/>' +
    '<circle cx="16" cy="12" r="1.8" fill="rgba(255,255,255,0.35)"/>' +
  '</svg>'
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
    '.p2-header { background: #6B0F0F; padding: 16px 40px 14px; text-align: center; border-bottom: 3px solid #d4aa5a; }',
    '.p2-header-eyebrow { font-family: "Dancing Script", cursive; font-size: 13px; color: rgba(212,170,90,0.85); margin-bottom: 2px; }',
    '.p2-header-title { font-family: "Dancing Script", cursive; font-size: 50px; color: #d4aa5a; line-height: 1.1; }',

    // Holly row — strictly left/right on ONE row
    '.holly-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 28px 0; }',

    // Salutation row — Dear X left, postmark right
    '.salutation-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 0 36px; margin-top: 2px; }',
    '.p2-salutation { font-family: "Dancing Script", cursive; font-size: 36px; color: #8B1A1A; line-height: 1.1; }',
    '.p2-postmark { border: 1.5px dashed #8B1A1A; border-radius: 4px; padding: 5px 12px; text-align: center; width: 115px; flex-shrink: 0; margin-top: 4px; }',
    '.p2-postmark-inner { border: 1px solid #8B1A1A; border-radius: 50%; padding: 3px 6px; font-size: 8.5px; font-style: italic; color: #8B1A1A; margin-bottom: 3px; }',
    '.p2-postmark-date { font-size: 8px; color: #8B1A1A; }',

    '.p2-date-full { font-size: 10.5px; color: rgba(44,26,14,0.55); font-style: italic; padding: 4px 36px 0; }',
    '.p2-divider { border: none; border-top: 1px solid rgba(139,90,43,0.3); margin: 8px 36px 10px; }',
    '.p2-body { padding: 0 36px; }',
    'p { font-size: 11px; line-height: 1.78; margin-bottom: 8px; color: #2a1508; font-style: italic; text-indent: 1.5em; }',

    // Sign off
    '.p2-signoff-wrap { margin: 8px 36px 0; padding-top: 10px; border-top: 1px solid rgba(139,90,43,0.2); }',
    '.p2-signoff-text { font-size: 10.5px; font-style: italic; color: rgba(44,26,14,0.55); margin-bottom: 2px; }',
    '.p2-signature { font-family: "Dancing Script", cursive; font-size: 42px; color: #8B1A1A; line-height: 1.1; }',
    '.p2-sig-divider { border: none; border-top: 1px solid rgba(139,90,43,0.25); margin: 4px 0 4px; width: 260px; }',
    '.p2-sig-titles { font-size: 9px; font-style: italic; color: rgba(44,26,14,0.5); margin-bottom: 1px; }',
    '.p2-sig-role { font-size: 9px; font-style: italic; color: rgba(44,26,14,0.45); margin-bottom: 8px; }',

    // Postmarked — sits directly under sig role
    '.p2-postmarked { border: 1px solid rgba(139,90,43,0.5); border-radius: 3px; padding: 4px 12px; font-size: 9px; font-style: italic; color: rgba(44,26,14,0.5); display: inline-block; margin-top: 6px; }',

    // Nice List — absolute bottom-right, stamp style
    '.p2-nice-list { position: absolute; bottom: 44px; right: 44px; border: 3px solid #2d6a2d; padding: 6px 14px; text-align: center; transform: rotate(-6deg); display: inline-block; box-shadow: inset 0 0 0 1px rgba(45,106,45,0.3); }',
    '.p2-nice-list-text { font-size: 10px; letter-spacing: 0.18em; font-weight: bold; color: #2d6a2d; line-height: 1.7; text-transform: uppercase; opacity: 0.85; }',

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

      // Holly — one left, one right, same row
      '<div class="holly-row">' +
        '<div>' + hollyLeft() + '</div>' +
        '<div>' + hollyRight() + '</div>' +
      '</div>' +

      // Salutation left, postmark right
      '<div class="salutation-row">' +
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
        '<div class="p2-postmarked">Postmarked · North Pole · ' + year + '</div>' +
      '</div>' +

      // Nice List — absolute bottom-right
      '<div class="p2-nice-list"><div class="p2-nice-list-text">NICE LIST<br>APPROVED</div></div>' +

      '<div class="p2-bottom-bar">' +
        '<div class="p2-footer-text">SantasLetter.ai &#9733; Official Correspondence of the North Pole Post Office &#9733; Est. CCLXXX A.D.</div>' +
      '</div>' +
    '</div>'

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    page1 + page2 +
    '</body></html>'
}