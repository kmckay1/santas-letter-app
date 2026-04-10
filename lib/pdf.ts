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
    if (isPS) {
      return `<p class="ps">${para}</p>`
    }
    // Detect rhyming couplet (short lines, near end)
    if (i >= paragraphs.length - 3 && para.length < 160 && para.includes(',')) {
      const lines = para.split(/\n|(?<=take,)|(?<=break\.)/)
      return `<div class="couplet"><p>${para}</p></div>`
    }
    return `<p>${para}</p>`
  }).join('')

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

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 680px;
    font-family: 'Dancing Script', cursive;
    background: #F5EDD0;
  }

  .page {
    width: 680px;
    min-height: 960px;
    background: #F5EDD0;
    position: relative;
    padding: 0;
  }

  /* Gold outer border */
  .border-outer {
    position: absolute;
    top: 18px; left: 18px; right: 18px; bottom: 18px;
    border: 2.2px solid #C8922A;
    pointer-events: none;
    z-index: 10;
  }
  .border-inner {
    position: absolute;
    top: 23px; left: 23px; right: 23px; bottom: 23px;
    border: 0.5px solid #D4AA5A;
    opacity: 0.5;
    pointer-events: none;
    z-index: 10;
  }

  /* Corner diamonds */
  .corner {
    position: absolute;
    width: 14px; height: 14px;
    background: #8B1A1A;
    transform: rotate(45deg);
    z-index: 20;
  }
  .corner-tl { top: 11px; left: 11px; }
  .corner-tr { top: 11px; right: 11px; }
  .corner-bl { bottom: 11px; left: 11px; }
  .corner-br { bottom: 11px; right: 11px; }

  /* Crimson header */
  .header {
    background: #600000;
    margin: 18px 18px 0;
    padding: 10px 0 18px;
    text-align: center;
  }
  .header-sub {
    font-size: 14px;
    color: rgba(245,237,208,0.85);
    font-weight: 400;
    margin-bottom: 2px;
  }
  .header-title {
    font-size: 68px;
    color: #C8922A;
    font-weight: 700;
    line-height: 1.1;
  }

  /* Gold rules */
  .gold-rule-thick {
    height: 2.5px;
    background: #C8922A;
    margin: 0 18px;
  }
  .gold-rule-thin {
    height: 0.6px;
    background: #C8922A;
    opacity: 0.5;
    margin: 0 18px;
  }

  /* Holly */
  .holly-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 38px 0;
  }
  .holly { font-size: 28px; line-height: 1; }

  /* Content area */
  .content {
    padding: 0 38px;
  }

  /* Stamp + date + salutation zone */
  .salutation-zone {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 14px;
    margin-bottom: 0;
  }
  .salutation {
    font-size: 36px;
    font-weight: 700;
    color: #8B1A1A;
    line-height: 1.2;
    flex: 1;
  }
  .stamp-date-block {
    text-align: right;
    flex-shrink: 0;
    margin-left: 16px;
  }

  /* Postmark stamp */
  .stamp {
    display: inline-block;
    border: 1.2px dashed #8B3A00;
    padding: 6px 10px;
    position: relative;
    background: rgba(245,237,208,0.7);
    text-align: center;
    width: 118px;
  }
  .stamp-oval {
    border: 1.4px solid #8B3A00;
    border-radius: 50%;
    padding: 4px 8px;
    font-size: 10px;
    color: #5A2000;
    line-height: 1.5;
  }
  .stamp-text { font-size: 9px; color: #5A2000; opacity: 0.85; margin-top: 2px; }

  .date {
    font-size: 16px;
    color: #1C0A00;
    margin-top: 6px;
    text-align: right;
  }

  /* Body rule */
  .body-rule {
    height: 0.8px;
    background: #C8922A;
    opacity: 0.4;
    margin: 10px 0 16px;
  }

  /* Body text */
  .body p {
    font-size: 16px;
    color: #1C0A00;
    line-height: 1.65;
    margin-bottom: 14px;
    text-indent: 24px;
  }
  .body p.ps {
    text-indent: 0;
    font-size: 15px;
  }

  /* Couplet */
  .couplet {
    text-align: center;
    border-top: 0.6px solid rgba(200,146,42,0.4);
    border-bottom: 0.6px solid rgba(200,146,42,0.4);
    padding: 12px 0;
    margin: 4px 0 14px;
  }
  .couplet p {
    font-size: 18px !important;
    text-indent: 0 !important;
    margin: 0 !important;
    line-height: 1.7 !important;
    color: #2C1200 !important;
  }

  /* Signature */
  .sig-rule {
    height: 0.6px;
    background: #C8922A;
    opacity: 0.3;
    margin: 8px 0;
    width: 60%;
  }
  .sig-warm {
    font-size: 15px;
    color: #1C0A00;
    margin-bottom: 4px;
  }
  .sig-name {
    font-size: 58px;
    font-weight: 700;
    color: #8B1A1A;
    line-height: 1.1;
  }
  .sig-underline {
    height: 1px;
    background: #8B1A1A;
    opacity: 0.35;
    width: 240px;
    margin: 2px 0 6px;
  }
  .sig-titles {
    font-size: 12px;
    color: #1C0A00;
    opacity: 0.7;
    line-height: 1.6;
  }

  /* Footer separator */
  .footer-sep {
    margin: 16px 18px 0;
    height: 1.5px;
    background: #C8922A;
    opacity: 0.65;
  }
  .footer-sep-thin {
    margin: 0 18px;
    height: 0.5px;
    background: #C8922A;
    opacity: 0.35;
  }

  /* Footer stamps row */
  .footer-stamps {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 38px;
  }
  .postmarked {
    border: 1.1px solid #8B3A00;
    padding: 5px 14px;
    font-size: 12px;
    color: #4A2000;
    opacity: 0.9;
  }
  .nice-list {
    border: 2.4px solid #1E4012;
    padding: 6px 18px;
    text-align: center;
    position: relative;
  }
  .nice-list::before {
    content: '';
    position: absolute;
    top: 4px; left: 4px; right: 4px; bottom: 4px;
    border: 0.6px solid #1E4012;
  }
  .nice-list-text {
    font-size: 15px;
    font-weight: 700;
    color: #1E4012;
    line-height: 1.5;
  }

  /* Crimson footer band */
  .footer-band {
    background: #600000;
    margin: 0 18px 18px;
    padding: 12px 0;
    text-align: center;
    border-top: 2px solid #C8922A;
  }
  .footer-band-text {
    font-size: 11px;
    color: #C8922A;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Borders -->
  <div class="border-outer"></div>
  <div class="border-inner"></div>

  <!-- Corner diamonds -->
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <!-- Crimson header -->
  <div class="header">
    <div class="header-sub">From the Desk of</div>
    <div class="header-title">Santa Claus</div>
  </div>
  <div class="gold-rule-thick"></div>
  <div class="gold-rule-thin"></div>

  <!-- Holly row -->
  <div class="holly-row">
    <span class="holly">🍃🍒</span>
    <span class="holly">🍒🍃</span>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- Salutation zone: Dear [name] left, stamp+date right -->
    <div class="salutation-zone">
      <div class="salutation">Dear ${child.name},</div>
      <div class="stamp-date-block">
        <div class="stamp">
          <div class="stamp-oval">
            <div>North Pole</div>
            <div>Post Office</div>
          </div>
          <div class="stamp-text">Dec 25 · ${year}</div>
        </div>
        <div class="date">25th December, ${year}</div>
      </div>
    </div>

    <!-- Rule below salutation -->
    <div class="body-rule"></div>

    <!-- Letter body -->
    <div class="body">
      ${bodyHTML}
    </div>

    <!-- Signature -->
    <div class="sig-rule"></div>
    <div class="sig-warm">With all the love and magic of Christmas,</div>
    <div class="sig-name">Santa Claus</div>
    <div class="sig-underline"></div>
    <div class="sig-titles">
      Kris Kringle · Father Christmas · St. Nicholas<br>
      Chief Correspondent, North Pole Post Office
    </div>

  </div>

  <!-- Footer -->
  <div class="footer-sep"></div>
  <div class="footer-sep-thin"></div>
  <div class="footer-stamps">
    <div class="postmarked">Postmarked · North Pole · ${year}</div>
    <div class="nice-list">
      <div class="nice-list-text">Nice List<br>Approved ✓</div>
    </div>
  </div>
  <div class="gold-rule-thick"></div>
  <div class="gold-rule-thin"></div>
  <div class="footer-band">
    <div class="footer-band-text">SantasLetter.ai  ✦  Official Correspondence of the North Pole Post Office  ✦  Est. CCLXXX A.D.</div>
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

  // Use puppeteer-core + @sparticuz/chromium for Vercel serverless
  const chromium = await import('@sparticuz/chromium-min')
  const puppeteer = await import('puppeteer-core')

  const executablePath = await chromium.default.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
  )

  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: { width: 680, height: 960 },
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await new Promise(r => setTimeout(r, 500)) // ensure fonts render

    const pdf = await page.pdf({
      width: '680px',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}