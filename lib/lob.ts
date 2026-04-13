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

  const hollyL =
    '<svg width="90" height="70" viewBox="0 0 90 70" xmlns="http://www.w3.org/2000/svg" style="display:block;">' +
    '<defs>' +
    '<radialGradient id="hlA" cx="38%" cy="30%"><stop offset="0%" stop-color="#ef6666"/><stop offset="100%" stop-color="#6b0f0f"/></radialGradient>' +
    '<radialGradient id="hlB" cx="38%" cy="30%"><stop offset="0%" stop-color="#ef6666"/><stop offset="100%" stop-color="#7a1010"/></radialGradient>' +
    '<radialGradient id="hlC" cx="38%" cy="30%"><stop offset="0%" stop-color="#f47878"/><stop offset="100%" stop-color="#8b1a1a"/></radialGradient>' +
    '<radialGradient id="hlLf1" cx="30%" cy="25%"><stop offset="0%" stop-color="#4aaa4a"/><stop offset="100%" stop-color="#1a5c1a"/></radialGradient>' +
    '<radialGradient id="hlLf2" cx="30%" cy="25%"><stop offset="0%" stop-color="#3d9e3d"/><stop offset="100%" stop-color="#174f17"/></radialGradient>' +
    '</defs>' +
    '<path d="M28,52 C24,46 18,44 16,38 C14,32 18,26 14,22 C18,20 22,24 24,22 C26,18 24,12 28,10 C32,12 30,18 34,20 C38,18 40,14 44,16 C44,22 40,26 42,30 C46,28 50,24 54,26 C52,32 46,34 46,40 C50,40 54,38 56,42 C52,46 46,44 44,50 C46,54 50,56 48,60 C44,60 42,54 38,54 C36,58 38,64 34,66 C30,64 32,58 28,56 Z" fill="url(#hlLf1)"/>' +
    '<path d="M28,52 C24,46 18,44 16,38 C14,32 18,26 14,22 C18,20 22,24 24,22 C26,18 24,12 28,10 C32,12 30,18 34,20 C38,18 40,14 44,16 C44,22 40,26 42,30 C46,28 50,24 54,26 C52,32 46,34 46,40 C50,40 54,38 56,42 C52,46 46,44 44,50 C46,54 50,56 48,60 C44,60 42,54 38,54 C36,58 38,64 34,66 C30,64 32,58 28,56 Z" fill="none" stroke="#155015" stroke-width="0.5"/>' +
    '<line x1="28" y1="10" x2="44" y2="50" stroke="#2d7a2d" stroke-width="0.8" opacity="0.6"/>' +
    '<line x1="36" y1="30" x2="16" y2="38" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<line x1="36" y1="30" x2="56" y2="42" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<path d="M48,12 C52,8 58,8 62,4 C66,8 62,12 64,16 C68,14 72,10 76,12 C74,18 68,18 68,24 C72,24 76,22 78,26 C74,30 68,28 66,34 C68,38 72,40 70,44 C66,42 64,36 60,36 C58,40 60,46 56,48 C52,44 54,38 50,36 C46,38 44,44 40,44 C38,40 42,36 40,30 C36,30 32,32 30,28 C34,24 40,26 42,20 C38,18 34,16 34,10 C38,10 42,14 46,12 Z" fill="url(#hlLf2)"/>' +
    '<path d="M48,12 C52,8 58,8 62,4 C66,8 62,12 64,16 C68,14 72,10 76,12 C74,18 68,18 68,24 C72,24 76,22 78,26 C74,30 68,28 66,34 C68,38 72,40 70,44 C66,42 64,36 60,36 C58,40 60,46 56,48 C52,44 54,38 50,36 C46,38 44,44 40,44 C38,40 42,36 40,30 C36,30 32,32 30,28 C34,24 40,26 42,20 C38,18 34,16 34,10 C38,10 42,14 46,12 Z" fill="none" stroke="#155015" stroke-width="0.5"/>' +
    '<line x1="48" y1="12" x2="56" y2="48" stroke="#2d7a2d" stroke-width="0.8" opacity="0.6"/>' +
    '<line x1="52" y1="30" x2="30" y2="28" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<line x1="52" y1="30" x2="78" y2="26" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<path d="M36,52 C40,48 46,46 50,42" stroke="#5a3e1b" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="38" cy="36" r="7.5" fill="url(#hlA)"/>' +
    '<circle cx="50" cy="32" r="7" fill="url(#hlB)"/>' +
    '<circle cx="44" cy="44" r="6.5" fill="url(#hlC)"/>' +
    '<circle cx="38" cy="29" r="1.2" fill="#3d1a00" opacity="0.7"/>' +
    '<circle cx="50" cy="25" r="1.2" fill="#3d1a00" opacity="0.7"/>' +
    '<circle cx="44" cy="37" r="1.2" fill="#3d1a00" opacity="0.7"/>' +
    '<circle cx="35" cy="33" r="2.5" fill="rgba(255,255,255,0.32)"/>' +
    '<circle cx="47" cy="29" r="2.2" fill="rgba(255,255,255,0.32)"/>' +
    '<circle cx="41" cy="41" r="2" fill="rgba(255,255,255,0.32)"/>' +
    '</svg>'

  const hollyR =
    '<svg width="90" height="70" viewBox="0 0 90 70" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-left:auto;">' +
    '<defs>' +
    '<radialGradient id="hrA" cx="38%" cy="30%"><stop offset="0%" stop-color="#ef6666"/><stop offset="100%" stop-color="#6b0f0f"/></radialGradient>' +
    '<radialGradient id="hrB" cx="38%" cy="30%"><stop offset="0%" stop-color="#ef6666"/><stop offset="100%" stop-color="#7a1010"/></radialGradient>' +
    '<radialGradient id="hrC" cx="38%" cy="30%"><stop offset="0%" stop-color="#f47878"/><stop offset="100%" stop-color="#8b1a1a"/></radialGradient>' +
    '<radialGradient id="hrLf1" cx="70%" cy="25%"><stop offset="0%" stop-color="#4aaa4a"/><stop offset="100%" stop-color="#1a5c1a"/></radialGradient>' +
    '<radialGradient id="hrLf2" cx="70%" cy="25%"><stop offset="0%" stop-color="#3d9e3d"/><stop offset="100%" stop-color="#174f17"/></radialGradient>' +
    '</defs>' +
    '<path d="M62,52 C66,46 72,44 74,38 C76,32 72,26 76,22 C72,20 68,24 66,22 C64,18 66,12 62,10 C58,12 60,18 56,20 C52,18 50,14 46,16 C46,22 50,26 48,30 C44,28 40,24 36,26 C38,32 44,34 44,40 C40,40 36,38 34,42 C38,46 44,44 46,50 C44,54 40,56 42,60 C46,60 48,54 52,54 C54,58 52,64 56,66 C60,64 58,58 62,56 Z" fill="url(#hrLf1)"/>' +
    '<path d="M62,52 C66,46 72,44 74,38 C76,32 72,26 76,22 C72,20 68,24 66,22 C64,18 66,12 62,10 C58,12 60,18 56,20 C52,18 50,14 46,16 C46,22 50,26 48,30 C44,28 40,24 36,26 C38,32 44,34 44,40 C40,40 36,38 34,42 C38,46 44,44 46,50 C44,54 40,56 42,60 C46,60 48,54 52,54 C54,58 52,64 56,66 C60,64 58,58 62,56 Z" fill="none" stroke="#155015" stroke-width="0.5"/>' +
    '<line x1="62" y1="10" x2="46" y2="50" stroke="#2d7a2d" stroke-width="0.8" opacity="0.6"/>' +
    '<line x1="54" y1="30" x2="74" y2="38" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<line x1="54" y1="30" x2="34" y2="42" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<path d="M42,12 C38,8 32,8 28,4 C24,8 28,12 26,16 C22,14 18,10 14,12 C16,18 22,18 22,24 C18,24 14,22 12,26 C16,30 22,28 24,34 C22,38 18,40 20,44 C24,42 26,36 30,36 C32,40 30,46 34,48 C38,44 36,38 40,36 C44,38 46,44 50,44 C52,40 48,36 50,30 C54,30 58,32 60,28 C56,24 50,26 48,20 C52,18 56,16 56,10 C52,10 48,14 44,12 Z" fill="url(#hrLf2)"/>' +
    '<path d="M42,12 C38,8 32,8 28,4 C24,8 28,12 26,16 C22,14 18,10 14,12 C16,18 22,18 22,24 C18,24 14,22 12,26 C16,30 22,28 24,34 C22,38 18,40 20,44 C24,42 26,36 30,36 C32,40 30,46 34,48 C38,44 36,38 40,36 C44,38 46,44 50,44 C52,40 48,36 50,30 C54,30 58,32 60,28 C56,24 50,26 48,20 C52,18 56,16 56,10 C52,10 48,14 44,12 Z" fill="none" stroke="#155015" stroke-width="0.5"/>' +
    '<line x1="42" y1="12" x2="34" y2="48" stroke="#2d7a2d" stroke-width="0.8" opacity="0.6"/>' +
    '<line x1="38" y1="30" x2="60" y2="28" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<line x1="38" y1="30" x2="12" y2="26" stroke="#2d7a2d" stroke-width="0.5" opacity="0.5"/>' +
    '<path d="M54,52 C50,48 44,46 40,42" stroke="#5a3e1b" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="52" cy="36" r="7.5" fill="url(#hrA)"/>' +
    '<circle cx="40" cy="32" r="7" fill="url(#hrB)"/>' +
    '<circle cx="46" cy="44" r="6.5" fill="url(#hrC)"/>' +
    '<circle cx="52" cy="29" r="1.2" fill="#3d1a00" opacity="0.7"/>' +
    '<circle cx="40" cy="25" r="1.2" fill="#3d1a00" opacity="0.7"/>' +
    '<circle cx="46" cy="37" r="1.2" fill="#3d1a00" opacity="0.7"/>' +
    '<circle cx="55" cy="33" r="2.5" fill="rgba(255,255,255,0.32)"/>' +
    '<circle cx="43" cy="29" r="2.2" fill="rgba(255,255,255,0.32)"/>' +
    '<circle cx="49" cy="41" r="2" fill="rgba(255,255,255,0.32)"/>' +
    '</svg>'

  const niceListStamp =
    '<div style="position:absolute;bottom:42px;right:40px;transform:rotate(-6deg);display:inline-block;">' +
      '<div style="border:3px solid #1f5c1f;padding:2px;">' +
        '<div style="border:1.5px solid #1f5c1f;padding:7px 16px;text-align:center;">' +
          '<div style="font-size:7px;letter-spacing:0.22em;color:#1f5c1f;font-weight:bold;line-height:1;margin-bottom:3px;">✦ NORTH POLE ✦</div>' +
          '<div style="font-size:11px;letter-spacing:0.18em;color:#1f5c1f;font-weight:bold;line-height:1.5;text-transform:uppercase;">NICE LIST</div>' +
          '<div style="font-size:11px;letter-spacing:0.18em;color:#1f5c1f;font-weight:bold;line-height:1.5;text-transform:uppercase;">APPROVED</div>' +
          '<div style="font-size:7px;letter-spacing:0.22em;color:#1f5c1f;font-weight:bold;line-height:1;margin-top:3px;">✦ ' + year + ' ✦</div>' +
        '</div>' +
      '</div>' +
    '</div>'

  const css = [
    '@import url(https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;1,400&family=Dancing+Script:wght@700&display=swap);',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body { font-family: Lora, Georgia, serif; background: #f5edd6; color: #2c1a0e; width: 8.5in; }',
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
    '.page2 { width: 8.5in; height: 11in; overflow: hidden; position: relative; background: #f5edd6; border: 8px solid #d4aa5a; }',
    '.p2-header { background: #6B0F0F; padding: 16px 40px 14px; text-align: center; border-bottom: 3px solid #d4aa5a; }',
    '.p2-header-eyebrow { font-family: "Dancing Script", cursive; font-size: 13px; color: rgba(212,170,90,0.85); margin-bottom: 2px; }',
    '.p2-header-title { font-family: "Dancing Script", cursive; font-size: 50px; color: #d4aa5a; line-height: 1.1; }',
    '.holly-row { display: table; width: 100%; padding: 10px 28px 0; }',
    '.holly-left { display: table-cell; text-align: left; vertical-align: middle; }',
    '.holly-right { display: table-cell; text-align: right; vertical-align: middle; }',
    '.sal-row { display: table; width: 100%; padding: 4px 28px 0; }',
    '.sal-left { display: table-cell; vertical-align: middle; }',
    '.sal-right { display: table-cell; text-align: right; vertical-align: middle; width: 160px; }',
    '.p2-salutation { font-family: "Dancing Script", cursive; font-size: 36px; color: #8B1A1A; line-height: 1.1; }',
    '.p2-postmark { border: 1.5px dashed #8B1A1A; border-radius: 4px; padding: 5px 12px; text-align: center; display: inline-block; margin-top: 4px; }',
    '.p2-postmark-inner { border: 1px solid #8B1A1A; border-radius: 50%; padding: 3px 8px; font-size: 8.5px; font-style: italic; color: #8B1A1A; margin-bottom: 3px; }',
    '.p2-postmark-date { font-size: 8px; color: #8B1A1A; }',
    '.p2-date-full { font-size: 10.5px; color: rgba(44,26,14,0.55); font-style: italic; padding: 4px 36px 0; }',
    '.p2-divider { border: none; border-top: 1px solid rgba(139,90,43,0.3); margin: 8px 36px 10px; }',
    '.p2-body { padding: 0 36px; }',
    'p { font-size: 11px; line-height: 1.78; margin-bottom: 8px; color: #2a1508; font-style: italic; text-indent: 1.5em; }',
    '.p2-signoff-wrap { margin: 8px 36px 0; padding-top: 10px; border-top: 1px solid rgba(139,90,43,0.2); }',
    '.p2-signoff-text { font-size: 10.5px; font-style: italic; color: rgba(44,26,14,0.55); margin-bottom: 2px; }',
    '.p2-signature { font-family: "Dancing Script", cursive; font-size: 42px; color: #8B1A1A; line-height: 1.1; }',
    '.p2-sig-divider { border: none; border-top: 1px solid rgba(139,90,43,0.25); margin: 4px 0 4px; width: 260px; }',
    '.p2-sig-titles { font-size: 9px; font-style: italic; color: rgba(44,26,14,0.5); margin-bottom: 1px; }',
    '.p2-sig-role { font-size: 9px; font-style: italic; color: rgba(44,26,14,0.45); margin-bottom: 8px; }',
    '.p2-postmarked { border: 1px solid rgba(139,90,43,0.5); border-radius: 3px; padding: 4px 12px; font-size: 9px; font-style: italic; color: rgba(44,26,14,0.5); display: inline-block; margin-top: 6px; }',
    '.p2-bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; }',
    '.p2-footer-text { background: #6B0F0F; text-align: center; padding: 7px; font-size: 8px; font-style: italic; color: #d4aa5a; letter-spacing: 0.08em; }',
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
        '<div class="bottom-bar"></div>' +
      '</div>' +
    '</div>'

  const page2 =
    '<div class="page2">' +
      '<div class="p2-header">' +
        '<div class="p2-header-eyebrow">From the Desk of</div>' +
        '<div class="p2-header-title">Santa Claus</div>' +
      '</div>' +

      '<div class="holly-row">' +
        '<div class="holly-left">' + hollyL + '</div>' +
        '<div class="holly-right">' + hollyR + '</div>' +
      '</div>' +

      '<div class="sal-row">' +
        '<div class="sal-left"><div class="p2-salutation">Dear ' + child.name + ',</div></div>' +
        '<div class="sal-right">' +
          '<div class="p2-postmark">' +
            '<div class="p2-postmark-inner">North Pole<br>Post Office</div>' +
            '<div class="p2-postmark-date">Dec 25 · ' + year + '</div>' +
          '</div>' +
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

      niceListStamp +

      '<div class="p2-bottom-bar">' +
        '<div class="p2-footer-text">SantasLetter.ai &#9733; Official Correspondence of the North Pole Post Office &#9733; Est. CCLXXX A.D.</div>' +
      '</div>' +
    '</div>'

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    page1 + page2 +
    '</body></html>'
}