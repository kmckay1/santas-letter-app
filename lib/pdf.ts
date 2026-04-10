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
    if (nearEnd && isShort && !isPS) return `<p class="couplet">${para}</p>`
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

  const starSVG = `<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin:0 5px;margin-bottom:2px"><polygon points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5" fill="#C8922A"/></svg>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@font-face {
  font-family: 'DS';
  font-weight: 400;
  src: url('data:font/woff2;base64,${DANCING_SCRIPT_400}') format('woff2');
}
@font-face {
  font-family: 'DS';
  font-weight: 700;
  src: url('data:font/woff2;base64,${DANCING_SCRIPT_700}') format('woff2');
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 680px;
  background: #F5EDD0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Single wrapper div IS the border — no absolute overlay crossing header */
.wrapper {
  margin: 18px;
  border: 2.2px solid #C8922A;
  position: relative;
  background: #F5EDD0;
}

/* Thin inner border inset */
.wrapper::after {
  content: '';
  position: absolute;
  top: 5px; left: 5px; right: 5px; bottom: 5px;
  border: 0.5px solid rgba(212,170,90,0.45);
  pointer-events: none;
}

/* Corner diamonds — inside the wrapper, corners of the outer border */
.corner {
  position: absolute;
  width: 14px; height: 14px;
  background: #8B1A1A;
  transform: rotate(45deg);
  z-index: 20;
}
.corner-tl { top: -8px; left: -8px; }
.corner-tr { top: -8px; right: -8px; }
.corner-bl { bottom: -8px; left: -8px; }
.corner-br { bottom: -8px; right: -8px; }

/* Header */
.header {
  background: #600000;
  padding: 14px 20px 14px;
  text-align: center;
}
.header-sub {
  font-family: 'DS', cursive;
  font-size: 13px;
  font-weight: 400;
  color: rgba(245,237,208,0.85);
  margin-bottom: 2px;
}
.header-title {
  font-family: 'DS', cursive;
  font-size: 64px;
  font-weight: 700;
  color: #C8922A;
  line-height: 1.1;
}

.rule-thick { height: 2.5px; background: #C8922A; }
.rule-thin  { height: 0.6px; background: rgba(212,170,90,0.5); }

/* Holly */
.holly-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 36px 0;
}

/* Content area */
.content { padding: 0 42px; }

/* Salutation + stamp */
.salutation-zone {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 12px;
}
.salutation {
  font-family: 'DS', cursive;
  font-size: 36px;
  font-weight: 700;
  color: #8B1A1A;
  line-height: 1.2;
  flex: 1;
}
.stamp-date-block { text-align: right; flex-shrink: 0; margin-left: 16px; }
.stamp {
  display: inline-block;
  border: 1.5px dashed #8B3A00;
  padding: 5px 8px;
  background: rgba(245,237,208,0.7);
  text-align: center;
  width: 118px;
}
.stamp-oval {
  border: 1.3px solid #8B3A00;
  border-radius: 50%;
  padding: 3px 6px;
  font-family: Georgia, serif;
  font-size: 10px;
  font-style: italic;
  color: #5A2000;
  line-height: 1.5;
}
.stamp-date-small {
  font-family: Georgia, serif;
  font-size: 8.5px;
  color: #5A2000;
  margin-top: 3px;
}
.date {
  font-family: Georgia, serif;
  font-size: 14px;
  font-style: italic;
  color: #1C0A00;
  margin-top: 5px;
}

/* One thin rule below salutation only */
.salutation-rule {
  height: 0.8px;
  background: rgba(200,146,42,0.35);
  margin: 10px 0 14px;
}

/* Body — Georgia serif, highly readable, elegant */
.body p {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 14.5px;
  color: #1C0A00;
  line-height: 1.8;
  margin-bottom: 14px;
  text-indent: 24px;
}
.body p.ps {
  text-indent: 0;
  font-style: italic;
  font-size: 14px;
  color: #2C1200;
}
/* Couplet — centred, italic, NO borders/lines */
.body p.couplet {
  text-indent: 0;
  text-align: center;
  font-style: italic;
  font-size: 15px;
  color: #2C1200;
  padding: 4px 20px;
  margin-bottom: 14px;
}

/* Signature */
.sig-gap { height: 8px; }
.sig-warm {
  font-family: Georgia, serif;
  font-size: 14px;
  font-style: italic;
  color: #1C0A00;
  margin-bottom: 2px;
}
/* Signature uses lighter weight DS for more pen-like feel */
.sig-name {
  font-family: 'DS', cursive;
  font-size: 56px;
  font-weight: 400;
  color: #8B1A1A;
  line-height: 1.05;
}
.sig-flourish {
  display: block;
  width: 260px;
  height: 14px;
  margin: 0 0 6px;
}
/* Titles with em-dash separators for clear spacing */
.sig-titles {
  font-family: Georgia, serif;
  font-size: 11px;
  font-style: italic;
  color: #2C1200;
  opacity: 0.7;
  line-height: 1.8;
}

/* Footer */
.footer-sep { height: 1.5px; background: #C8922A; opacity: 0.65; margin-top: 16px; }
.footer-sep-thin { height: 0.5px; background: #C8922A; opacity: 0.35; }
.footer-stamps {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 42px;
}
.postmarked {
  border: 1.1px solid #8B3A00;
  padding: 5px 12px;
  font-family: Georgia, serif;
  font-size: 11.5px;
  font-style: italic;
  color: #4A2000;
}

/* Nice List — rubber stamp look: angled, distressed border */
.nice-stamp {
  display: inline-block;
  border: 2.5px solid #1E4012;
  padding: 7px 18px;
  text-align: center;
  position: relative;
  transform: rotate(-4deg);
  background: transparent;
}
.nice-stamp::before {
  content: '';
  position: absolute;
  top: 3px; left: 3px; right: 3px; bottom: 3px;
  border: 1px solid rgba(30,64,18,0.5);
}
.nice-stamp-text {
  font-family: Georgia, serif;
  font-size: 13.5px;
  font-weight: bold;
  color: #1E4012;
  letter-spacing: 1px;
  line-height: 1.5;
  position: relative;
  z-index: 1;
  text-transform: uppercase;
}

.footer-band {
  background: #600000;
  padding: 11px 0;
  text-align: center;
  border-top: 2px solid #C8922A;
  margin-top: 0;
}
.footer-band-text {
  font-family: Georgia, serif;
  font-size: 10.5px;
  font-style: italic;
  color: #C8922A;
}
</style>
</head>
<body>
<div style="background:#F5EDD0;padding:18px;">
<div class="wrapper">
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

    <div class="salutation-rule"></div>
    <div class="body">${bodyHTML}</div>

    <div class="sig-gap"></div>
    <div class="sig-warm">With all the love and magic of Christmas,</div>
    <div class="sig-name">Santa Claus</div>
    <svg class="sig-flourish" viewBox="0 0 260 14" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,9 C40,3 80,12 130,8 C180,4 220,11 260,7" fill="none" stroke="#8B1A1A" stroke-width="1.3" stroke-linecap="round" opacity="0.45"/>
    </svg>
    <div class="sig-titles">
      Kris Kringle &nbsp;&mdash;&nbsp; Father Christmas &nbsp;&mdash;&nbsp; St. Nicholas<br>
      Chief Correspondent, North Pole Post Office
    </div>
  </div>

  <div class="footer-sep"></div>
  <div class="footer-sep-thin"></div>
  <div class="footer-stamps">
    <div class="postmarked">Postmarked &middot; North Pole &middot; ${year}</div>
    <div class="nice-stamp">
      <div class="nice-stamp-text">Nice List<br>Approved</div>
    </div>
  </div>
  <div class="footer-band">
    <div class="footer-band-text">SantasLetter.ai ${starSVG} Official Correspondence of the North Pole Post Office ${starSVG} Est. CCLXXX A.D.</div>
  </div>
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
      format: '680xauto',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      use_print: false,
      landscape: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PDFShift error ${response.status}: ${error}`)
  }

  return Buffer.from(await response.arrayBuffer())
}