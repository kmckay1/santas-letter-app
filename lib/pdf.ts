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
    if (isPS) return `<p style="font-style:italic;text-indent:0;margin-bottom:12px;font-family:'DS',cursive;font-weight:400;font-size:17px;">${para}</p>`
    if (nearEnd && isShort && !isPS) return `<p style="text-align:center;font-style:italic;text-indent:0;margin-bottom:12px;font-size:18px;font-family:'DS',cursive;font-weight:400;">${para}</p>`
    return `<p style="text-indent:24px;margin-bottom:14px;font-family:'DS',cursive;font-weight:400;font-size:17px;line-height:1.75;">${para}</p>`
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
* { margin:0; padding:0; box-sizing:border-box; }
html, body {
  width: 680px;
  background: #F5EDD0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
</style>
</head>
<body>

<!-- Outer parchment padding -->
<div style="background:#F5EDD0; padding:18px 18px 0 18px;">

  <!-- THE BORDER: single div, no pseudo-elements, no ::after -->
  <div style="border: 2.2px solid #C8922A; position:relative; background:#F5EDD0;">

    <!-- Corner diamonds: positioned at corners of the border div -->
    <div style="position:absolute;top:-8px;left:-8px;width:14px;height:14px;background:#8B1A1A;transform:rotate(45deg);z-index:10;"></div>
    <div style="position:absolute;top:-8px;right:-8px;width:14px;height:14px;background:#8B1A1A;transform:rotate(45deg);z-index:10;"></div>
    <div style="position:absolute;bottom:-8px;left:-8px;width:14px;height:14px;background:#8B1A1A;transform:rotate(45deg);z-index:10;"></div>
    <div style="position:absolute;bottom:-8px;right:-8px;width:14px;height:14px;background:#8B1A1A;transform:rotate(45deg);z-index:10;"></div>

    <!-- HEADER: crimson band. No border-inner crossing this. -->
    <div style="background:#600000; text-align:center; padding:16px 20px 14px;">
      <div style="font-family:'DS',cursive; font-weight:400; font-size:17px; color:rgba(245,237,208,0.85); margin-bottom:2px;">From the Desk of</div>
      <div style="font-family:'DS',cursive; font-weight:700; font-size:64px; color:#C8922A; line-height:1.1;">Santa Claus</div>
    </div>

    <!-- Gold rules below header -->
    <div style="height:2.5px; background:#C8922A;"></div>
    <div style="height:0.6px; background:rgba(212,170,90,0.5);"></div>

    <!-- Holly row -->
    <div style="display:flex; justify-content:space-between; padding:10px 36px 0; align-items:center;">
      <div>${hollyLeft}</div>
      <div>${hollyRight}</div>
    </div>

    <!-- CONTENT AREA -->
    <div style="padding:0 42px;">

      <!-- Salutation + stamp -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:12px;">
        <div style="font-family:'DS',cursive; font-weight:700; font-size:36px; color:#8B1A1A; line-height:1.2; flex:1;">Dear ${child.name},</div>
        <div style="text-align:right; flex-shrink:0; margin-left:16px;">
          <div style="display:inline-block; border:1.5px dashed #8B3A00; padding:5px 8px; background:rgba(245,237,208,0.7); text-align:center; width:118px;">
            <div style="border:1.3px solid #8B3A00; border-radius:50%; padding:3px 6px; font-family:Georgia,serif; font-size:10px; font-style:italic; color:#5A2000; line-height:1.5;">
              <div>North Pole</div>
              <div>Post Office</div>
            </div>
            <div style="font-family:Georgia,serif; font-size:8.5px; color:#5A2000; margin-top:3px;">Dec 25 &middot; ${year}</div>
          </div>
          <div style="font-family:Georgia,serif; font-size:14px; font-style:italic; color:#1C0A00; margin-top:5px;">25th December, ${year}</div>
        </div>
      </div>

      <!-- Single thin rule below salutation ONLY -->
      <div style="height:0.8px; background:rgba(200,146,42,0.35); margin:10px 0 14px;"></div>

      <!-- Body text: Georgia, no extra rules, no borders anywhere -->
      <div style="font-family:'DS',cursive; font-weight:400; font-size:17px; color:#1C0A00; line-height:1.75;">
        ${bodyHTML}
      </div>

      <!-- Signature section -->
      <div style="height:8px;"></div>
      <div style="font-family:Georgia,serif; font-size:14px; font-style:italic; color:#1C0A00; margin-bottom:2px;">With all the love and magic of Christmas,</div>
      <div style="font-family:'DS',cursive; font-weight:400; font-size:58px; color:#8B1A1A; line-height:1.05;">Santa Claus</div>
      <!-- Pen flourish SVG -->
      <svg style="display:block;width:260px;height:14px;margin:0 0 6px;" viewBox="0 0 260 14" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,9 C50,3 100,13 160,8 C200,4 235,11 260,7" fill="none" stroke="#8B1A1A" stroke-width="1.3" stroke-linecap="round" opacity="0.4"/>
      </svg>
      <div style="font-family:Georgia,serif; font-size:11px; font-style:italic; color:#2C1200; opacity:0.7; line-height:1.8;">
        Kris Kringle &nbsp;&mdash;&nbsp; Father Christmas &nbsp;&mdash;&nbsp; St. Nicholas<br>
        Chief Correspondent, North Pole Post Office
      </div>

    </div><!-- end content -->

    <!-- Footer separator -->
    <div style="height:1.5px; background:#C8922A; opacity:0.65; margin-top:16px;"></div>
    <div style="height:0.5px; background:#C8922A; opacity:0.35;"></div>

    <!-- Footer stamps row -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 42px;">
      <div style="border:1.1px solid #8B3A00; padding:5px 12px; font-family:Georgia,serif; font-size:11.5px; font-style:italic; color:#4A2000;">
        Postmarked &middot; North Pole &middot; ${year}
      </div>
      <!-- Rubber stamp: rotated, double border, uppercase stencil look -->
      <div style="transform:rotate(-5deg); display:inline-block; padding:2px;">
        <div style="border:2.8px solid #1E4012; padding:8px 20px; text-align:center; position:relative;">
          <div style="position:absolute;top:4px;left:4px;right:4px;bottom:4px;border:1px solid rgba(30,64,18,0.5);"></div>
          <div style="font-family:Georgia,serif; font-size:11px; font-weight:bold; color:#1E4012; letter-spacing:2px; text-transform:uppercase; line-height:1.6; position:relative;">
            NICE LIST<br>APPROVED
          </div>
        </div>
      </div>
    </div>

    <!-- Gold rules above footer band -->
    <div style="height:2px; background:#C8922A;"></div>
    <div style="height:0.5px; background:rgba(212,170,90,0.5);"></div>

    <!-- Crimson footer band -->
    <div style="background:#600000; padding:11px 0; text-align:center;">
      <div style="font-family:Georgia,serif; font-size:10.5px; font-style:italic; color:#C8922A;">
        SantasLetter.ai ${starSVG} Official Correspondence of the North Pole Post Office ${starSVG} Est. CCLXXX A.D.
      </div>
    </div>

  </div><!-- end border wrapper -->
</div><!-- end outer padding -->

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