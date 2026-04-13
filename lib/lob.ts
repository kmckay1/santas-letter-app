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

function hollyLeft(): string {
  return (
    '<svg width="90" height="60" viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<radialGradient id="blA" cx="38%" cy="32%"><stop offset="0%" stop-color="#e85858"/><stop offset="100%" stop-color="#7a0a0a"/></radialGradient>' +
    '<radialGradient id="blB" cx="38%" cy="32%"><stop offset="0%" stop-color="#dd4a4a"/><stop offset="100%" stop-color="#6e0808"/></radialGradient>' +
    '<radialGradient id="blC" cx="38%" cy="32%"><stop offset="0%" stop-color="#f06060"/><stop offset="100%" stop-color="#880c0c"/></radialGradient>' +
    '</defs>' +
    // Leaf 1 — large, bottom-left, pointing left
    '<ellipse cx="20" cy="36" rx="22" ry="11" fill="#2a5e1e" stroke="#163010" stroke-width="0.8" transform="rotate(-25 20 36)"/>' +
    '<ellipse cx="20" cy="36" rx="16" ry="7" fill="#366828" transform="rotate(-25 20 36)"/>' +
    // Leaf 2 — upper, pointing upper-left
    '<ellipse cx="28" cy="20" rx="20" ry="10" fill="#2a5e1e" stroke="#163010" stroke-width="0.8" transform="rotate(-55 28 20)"/>' +
    '<ellipse cx="28" cy="20" rx="14" ry="6" fill="#366828" transform="rotate(-55 28 20)"/>' +
    // Stem
    '<line x1="38" y1="30" x2="52" y2="22" stroke="#6b4010" stroke-width="1.8" stroke-linecap="round"/>' +
    '<line x1="52" y1="22" x2="62" y2="28" stroke="#6b4010" stroke-width="1.4" stroke-linecap="round"/>' +
    '<line x1="52" y1="22" x2="58" y2="12" stroke="#6b4010" stroke-width="1.4" stroke-linecap="round"/>' +
    // Berries
    '<circle cx="63" cy="30" r="9" fill="url(#blA)"/>' +
    '<circle cx="58" cy="11" r="8" fill="url(#blB)"/>' +
    '<circle cx="74" cy="19" r="8.5" fill="url(#blC)"/>' +
    // Berry highlights
    '<circle cx="60" cy="26" r="2.8" fill="rgba(255,255,255,0.45)"/>' +
    '<circle cx="55" cy="8" r="2.5" fill="rgba(255,255,255,0.45)"/>' +
    '<circle cx="71" cy="16" r="2.5" fill="rgba(255,255,255,0.45)"/>' +
    '</svg>'
  )
}

function hollyRight(): string {
  return (
    '<svg width="90" height="60" viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<radialGradient id="brA" cx="38%" cy="32%"><stop offset="0%" stop-color="#e85858"/><stop offset="100%" stop-color="#7a0a0a"/></radialGradient>' +
    '<radialGradient id="brB" cx="38%" cy="32%"><stop offset="0%" stop-color="#dd4a4a"/><stop offset="100%" stop-color="#6e0808"/></radialGradient>' +
    '<radialGradient id="brC" cx="38%" cy="32%"><stop offset="0%" stop-color="#f06060"/><stop offset="100%" stop-color="#880c0c"/></radialGradient>' +
    '</defs>' +
    // Leaf 1 — large, bottom-right, pointing right
    '<ellipse cx="70" cy="36" rx="22" ry="11" fill="#2a5e1e" stroke="#163010" stroke-width="0.8" transform="rotate(25 70 36)"/>' +
    '<ellipse cx="70" cy="36" rx="16" ry="7" fill="#366828" transform="rotate(25 70 36)"/>' +
    // Leaf 2 — upper, pointing upper-right
    '<ellipse cx="62" cy="20" rx="20" ry="10" fill="#2a5e1e" stroke="#163010" stroke-width="0.8" transform="rotate(55 62 20)"/>' +
    '<ellipse cx="62" cy="20" rx="14" ry="6" fill="#366828" transform="rotate(55 62 20)"/>' +
    // Stem
    '<line x1="52" y1="30" x2="38" y2="22" stroke="#6b4010" stroke-width="1.8" stroke-linecap="round"/>' +
    '<line x1="38" y1="22" x2="28" y2="28" stroke="#6b4010" stroke-width="1.4" stroke-linecap="round"/>' +
    '<line x1="38" y1="22" x2="32" y2="12" stroke="#6b4010" stroke-width="1.4" stroke-linecap="round"/>' +
    // Berries
    '<circle cx="27" cy="30" r="9" fill="url(#brA)"/>' +
    '<circle cx="32" cy="11" r="8" fill="url(#brB)"/>' +
    '<circle cx="16" cy="19" r="8.5" fill="url(#brC)"/>' +
    // Berry highlights
    '<circle cx="30" cy="26" r="2.8" fill="rgba(255,255,255,0.45)"/>' +
    '<circle cx="35" cy="8" r="2.5" fill="rgba(255,255,255,0.45)"/>' +
    '<circle cx="19" cy="16" r="2.5" fill="rgba(255,255,255,0.45)"/>' +
    '</svg>'
  )
}

function buildLetterHtml(child: ChildInfo, letterText: string, toAddress: MailAddress): string {
  const paragraphs = letterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => '<p>' + p.replace(/\*/g, '') + '</p>')
    .join('')

  const year = new Date().getFullYear()

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
        '<div class="holly-left">' + hollyLeft() + '</div>' +
        '<div class="holly-right">' + hollyRight() + '</div>' +
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