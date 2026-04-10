import { ChildInfo } from '@/types'
import { DANCING_SCRIPT_400, DANCING_SCRIPT_700 } from './font-data'

function buildLetterHTML(child: ChildInfo, letterText: string): string {
  const year = new Date().getFullYear()

  const paragraphs = letterText
    .replace(/^Dear\s+\S.*?,\s*/i, '')
    .split('\n\n')
    .map(p => p.replace(/\*/g, '').replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0)

  const bodyHTML = paragraphs.map((para, i) => {
    const isPS = para.startsWith('P.S') || para.startsWith('PS.')
    const nearEnd = i >= paragraphs.length - 3
    const isShort = para.split(' ').length < 25
    if (isPS) return `<p class="ps">${para}</p>`
    if (nearEnd && isShort && !isPS) return `<div class="couplet"><p>${para}</p></div>`
    return `<p>${para}</p>`
  }).join('')

  const hollyLeft = `<svg width="52" height="30" viewBox="0 0 52 30" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="13" cy="17" rx="14" ry="8" fill="#2D5A1B" transform="rotate(-32 13 17)"/>
    <ellipse cx="30" cy="11" rx="14" ry="8" fill="#1E4012" transform="rotate(20 30 11)"/>
    <circle cx="21" cy="13" r="6.5" fill="#8B1A1A"/>
    <circle cx="30" cy="19" r="5" fill="#7B1212"/>
    <circle cx="18" cy="20" r="4" fill="#8B1A1A"/>
  </svg>`

  const hollyRight = `<svg width="52" height="30" viewBox="0 0 52 30" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="39" cy="17" rx="14" ry="8" fill="#2D5A1B" transform="rotate(32 39 17)"/>
    <ellipse cx="22" cy="11" rx="14" ry="8" fill="#1E4012" transform="rotate(-20 22 11)"/>
    <circle cx="31" cy="13" r="6.5" fill="#8B1A1A"/>
    <circle cx="22" cy="19" r="5" fill="#7B1212"/>
    <circle cx="34" cy="20" r="4" fill="#8B1A1A"/>
  </svg>`

  const starSVG = (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin:0 5px"><polygon points="7,0 8.5,5 14,5 9.5,8 11,14 7,10 3,14 4.5,8 0,5 5.5,5" fill="#C8922A"/></svg>`

  const checkSVG = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-bottom:2px"><polyline points="2,8 6,13 14,3" stroke="#1E4012" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@font-face {
  font-family: 'Dancing Script';
  font-weight: 400;
  src: url('data:font/woff2;base64,${DANCING_SCRIPT_400}') format('woff2');
}
@font-face {
  font-family: 'Dancing Script';
  font-weight: 700;
  src: url('data:font/woff2;base64,${DANCING_SCRIPT_700}') format('woff2');
}
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:680px; background:#F5EDD0; font-family:'Dancing Script',cursive; }

.page {
  width:680px;
  background:#F5EDD0;
  position:relative;
  padding-bottom: 20px;
}

/* Borders */
.border-outer {
  position:absolute; top:18px; left:18px; right:18px; bottom:18px;
  border:2.2px solid #C8922A; pointer-events:none; z-index:10;
}
.border-inner {
  position:absolute; top:23px; left:23px; right:23px; bottom:23px;
  border:0.5px solid #D4AA5A; opacity:0.5; pointer-events:none; z-index:10;
}

/* Corner diamonds */
.corner { position:absolute; width:14px; height:14px; background:#8B1A1A; transform:rotate(45deg); z-index:20; }
.corner-tl { top:11px; left:11px; }
.corner-tr { top:11px; right:11px; }
.corner-bl { bottom:11px; left:11px; }
.corner-br { bottom:11px; right:11px; }

/* Header */
.header { background:#600000; margin:18px 18px 0; padding:8px 20px 12px; text-align:center; }
.header-sub { font-size:13px; color:rgba(245,237,208,0.85); font-weight:400; }
.header-title { font-size:66px; color:#C8922A; font-weight:700; line-height:1.1; }

.rule-thick { height:2.5px; background:#C8922A; margin:0 18px; }
.rule-thin  { height:0.6px; background:#C8922A; opacity:0.5; margin:0 18px; }

/* Holly */
.holly-row { display:flex; justify-content:space-between; padding:10px 36px 0; align-items:center; }

/* Content */
.content { padding:0 38px; }

/* Salutation zone */
.salutation-zone { display:flex; justify-content:space-between; align-items:flex-start; margin-top:12px; }
.salutation { font-size:36px; font-weight:700; color:#8B1A1A; line-height:1.2; flex:1; }
.stamp-date-block { text-align:right; flex-shrink:0; margin-left:16px; }

/* Postmark stamp */
.stamp {
  display:inline-block; border:1.5px dashed #8B3A00;
  padding:5px 8px; background:rgba(245,237,208,0.7);
  text-align:center; width:120px;
}
.stamp-oval {
  border:1.3px solid #8B3A00; border-radius:50%;
  padding:3px 6px; font-size:10px; color:#5A2000; line-height:1.5;
}
.stamp-date-small { font-size:8.5px; color:#5A2000; opacity:0.85; margin-top:3px; }
.date { font-size:15px; color:#1C0A00; margin-top:5px; text-align:right; }

.body-rule { height:0.8px; background:#C8922A; opacity:0.4; margin:10px 0 14px; }

/* Body */
.body p { font-size:15.5px; color:#1C0A00; line-height:1.65; margin-bottom:12px; text-indent:22px; }
.body p.ps { text-indent:0; font-size:15px; }

/* Couplet */
.couplet {
  border-top:0.6px solid rgba(200,146,42,0.4);
  border-bottom:0.6px solid rgba(200,146,42,0.4);
  padding:10px 0; margin:2px 0 12px; text-align:center;
}
.couplet p { font-size:17px !important; text-indent:0 !important; margin:0 !important; line-height:1.75 !important; color:#2C1200 !important; }

/* Signature */
.sig-rule { height:0.6px; background:#C8922A; opacity:0.3; margin:6px 0; width:58%; }
.sig-warm { font-size:14.5px; color:#1C0A00; margin-bottom:2px; }
.sig-name { font-size:56px; font-weight:700; color:#8B1A1A; line-height:1.1; }
.sig-underline { height:1px; background:#8B1A1A; opacity:0.35; width:230px; margin:2px 0 5px; }
.sig-titles { font-size:11.5px; color:#1C0A00; opacity:0.7; line-height:1.65; }

/* Footer */
.footer-sep      { margin:14px 18px 0; height:1.5px; background:#C8922A; opacity:0.65; }
.footer-sep-thin { margin:0 18px; height:0.5px; background:#C8922A; opacity:0.35; }

.footer-stamps { display:flex; justify-content:space-between; align-items:center; padding:10px 38px; }
.postmarked { border:1.1px solid #8B3A00; padding:5px 12px; font-size:12px; color:#4A2000; }
.nice-list { border:2.4px solid #1E4012; padding:6px 16px; text-align:center; position:relative; }
.nice-list-inner { position:absolute; top:4px; left:4px; right:4px; bottom:4px; border:0.6px solid #1E4012; }
.nice-list-text { font-size:14px; font-weight:700; color:#1E4012; line-height:1.5; position:relative; z-index:1; }

/* Footer band */
.footer-band { background:#600000; margin:0 18px 18px; padding:11px 0; text-align:center; border-top:2px solid #C8922A; }
.footer-band-text { font-size:11px; color:#C8922A; }
</style>
</head>
<body>
<div class="page">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <div class="header">
    <div class="header-sub">From the Desk of</div>
    <div class="header-title">Santa Claus</div>
  </div>
  <div class="rule-thick"></div>
  <div class="rule-thin"></div>

  <div class="holly-row">
    <div>${hollyLeft}</div>
    <div>${hollyRight}</div>
  </div>

  <div class="content">
    <div class="salutation-zone">
      <div class="salutation">Dear ${child.name},</div>
      <div class="stamp-date-block">
        <div class="stamp">
          <div class="stamp-oval">
            <div>North Pole</div>
            <div>Post Office</div>
          </div>
          <div class="stamp-date-small">Dec 25 &middot; ${year}</div>
        </div>
        <div class="date">25th December, ${year}</div>
      </div>
    </div>

    <div class="body-rule"></div>
    <div class="body">${bodyHTML}</div>

    <div class="sig-rule"></div>
    <div class="sig-warm">With all the love and magic of Christmas,</div>
    <div class="sig-name">Santa Claus</div>
    <div class="sig-underline"></div>
    <div class="sig-titles">
      Kris Kringle &middot; Father Christmas &middot; St. Nicholas<br>
      Chief Correspondent, North Pole Post Office
    </div>
  </div>

  <div class="footer-sep"></div>
  <div class="footer-sep-thin"></div>
  <div class="footer-stamps">
    <div class="postmarked">Postmarked &middot; North Pole &middot; ${year}</div>
    <div class="nice-list">
      <div class="nice-list-inner"></div>
      <div class="nice-list-text">Nice List<br>${checkSVG} Approved</div>
    </div>
  </div>
  <div class="rule-thick"></div>
  <div class="rule-thin"></div>
  <div class="footer-band">
    <div class="footer-band-text">SantasLetter.ai ${starSVG()} Official Correspondence of the North Pole Post Office ${starSVG()} Est. CCLXXX A.D.</div>
  </div>
</div>
</body>
</html>`
}

export async function generatePremiumPDF(
  child: ChildInfo,
  letterText: string
): Promise<Buffer> {
  const html = buildLetterHTML(child, letterText)

  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY env var not set')

  const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: html,
      format: 'Letter',
      use_print: false,
      landscape: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PDFShift error ${response.status}: ${error}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}