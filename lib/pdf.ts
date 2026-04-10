import { PDFDocument, rgb, degrees, PDFPage, PDFFont } from 'pdf-lib'
import { ChildInfo } from '@/types'
import path from 'path'
import fs from 'fs'

const C = {
  parchment:  rgb(0.961, 0.929, 0.816),
  crimson:    rgb(0.545, 0.102, 0.102),
  crimsonDk:  rgb(0.380, 0.063, 0.063),
  gold:       rgb(0.788, 0.573, 0.165),
  goldLight:  rgb(0.855, 0.702, 0.400),
  ink:        rgb(0.110, 0.039, 0.000),
  inkBody:    rgb(0.173, 0.102, 0.055),
  brown:      rgb(0.545, 0.227, 0.000),
  green:      rgb(0.173, 0.353, 0.106),
  greenDk:    rgb(0.118, 0.251, 0.071),
  berry:      rgb(0.482, 0.071, 0.071),
  black:      rgb(0, 0, 0),
  white:      rgb(1, 1, 1),
}

function getFontPath(filename: string): string {
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', filename),
    path.join('/var/task/public/fonts', filename),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error(`Font not found: ${filename}`)
}

export async function generatePremiumPDF(
  child: ChildInfo,
  letterText: string
): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`A Letter from Santa for ${child.name}`)
  doc.setAuthor('Santa Claus — North Pole Post Office')

  const ds400 = fs.readFileSync(getFontPath('dancing-script-400.ttf'))
  const ds700 = fs.readFileSync(getFontPath('dancing-script-700.ttf'))
  const dsReg  = await doc.embedFont(ds400)
  const dsBold = await doc.embedFont(ds700)

  const W = 612, H = 918
  const page = doc.addPage([W, H])
  const ml = 38, mr = 38
  const textW = W - ml - mr

  // Background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.parchment })

  // Gold border
  const bp = 16
  page.drawRectangle({ x: bp, y: bp, width: W - bp*2, height: H - bp*2, borderColor: C.gold, borderWidth: 2.2, color: C.black, opacity: 0 })
  page.drawRectangle({ x: bp+5, y: bp+5, width: W - (bp+5)*2, height: H - (bp+5)*2, borderColor: C.goldLight, borderWidth: 0.5, color: C.black, opacity: 0 })

  // Corner diamonds
  const corners: [number,number][] = [[bp,bp],[W-bp,bp],[bp,H-bp],[W-bp,H-bp]]
  corners.forEach(([cx,cy]) => page.drawRectangle({ x: cx-6, y: cy-6, width: 12, height: 12, color: C.crimson, rotate: degrees(45) }))

  // Crimson header band
  const headerH = 98
  page.drawRectangle({ x: bp, y: H-bp-headerH, width: W-bp*2, height: headerH, color: C.crimsonDk })
  page.drawRectangle({ x: bp, y: H-bp-headerH-2.5, width: W-bp*2, height: 2.5, color: C.gold })
  page.drawRectangle({ x: bp, y: H-bp-headerH-3.5, width: W-bp*2, height: 0.6, color: C.gold, opacity: 0.5 })

  // Header text
  drawCentered(page, dsReg, 'From the Desk of', 13, W, H-bp-28, C.parchment, 0.85)
  drawCentered(page, dsBold, 'Santa Claus', 62, W, H-bp-98, C.gold)

  // Holly
  const hollyY = H - bp - headerH - 22
  drawHolly(page, 46, hollyY)
  drawHollyMirror(page, W-46, hollyY)

  // Rules
  const ruleY = hollyY - 22
  page.drawLine({ start:{x:ml,y:ruleY}, end:{x:W-mr,y:ruleY}, thickness:1.2, color:C.gold, opacity:0.55 })
  page.drawLine({ start:{x:ml,y:ruleY-3}, end:{x:W-mr,y:ruleY-3}, thickness:0.4, color:C.gold, opacity:0.3 })

  // Postmark stamp — right side
  const sW = 118, sH = 62
  const sX = W - mr - sW, sY = ruleY - sH - 14
  page.drawRectangle({ x:sX, y:sY, width:sW, height:sH, color:C.parchment, opacity:0.7 })
  drawDashedRect(page, sX, sY, sW, sH, C.brown, 0.7)
  const sCX = sX + sW/2, sCY = sY + sH/2
  page.drawEllipse({ x:sCX, y:sCY, xScale:50, yScale:22, borderColor:C.brown, borderWidth:1.4, color:C.black, opacity:0 })
  page.drawEllipse({ x:sCX, y:sCY, xScale:44, yScale:16, borderColor:C.brown, borderWidth:0.5, color:C.black, opacity:0 })
  drawCentered(page, dsReg, 'North Pole',   9.5, sX*2+sW, sY+sH/2+6,  C.brown, 0.9)
  drawCentered(page, dsReg, 'Post Office',  10.5, sX*2+sW, sY+sH/2-6, C.brown, 0.9)
  drawCentered(page, dsReg, 'Dec 25 · 2025', 8.5, sX*2+sW, sY+sH/2-19, C.brown, 0.85)

  // Date — right aligned, below stamp
  const dateText = `25th December, ${new Date().getFullYear()}`
  const dateW = dsReg.widthOfTextAtSize(dateText, 15)
  const dateY = sY - 18
  page.drawText(dateText, { x: W-mr-dateW, y: dateY, font: dsReg, size: 15, color: C.ink })

  // Salutation — left, same zone
  const salutY = sY + 10
  page.drawText(`Dear ${child.name},`, { x: ml, y: salutY, font: dsBold, size: 34, color: C.crimson })

  // Rule below salutation
  const bodyRuleY = Math.min(salutY - 12, dateY - 12)
  page.drawLine({ start:{x:ml,y:bodyRuleY}, end:{x:W-mr,y:bodyRuleY}, thickness:0.8, color:C.gold, opacity:0.4 })

  // Letter body
  const paragraphs = letterText
    .replace(/^Dear\s+\S.*?,\s*/i, '')
    .split('\n\n')
    .map(p => p.replace(/\*/g,'').replace(/\n/g,' ').trim())
    .filter(p => p.length > 0)

  const fSize = 14.5
  const lineH = fSize * 1.55
  let curY = bodyRuleY - 22
  let curPage: PDFPage = page

  const newPage = () => {
    const p = doc.addPage([W, H])
    p.drawRectangle({ x:0, y:0, width:W, height:H, color:C.parchment })
    p.drawRectangle({ x:bp, y:bp, width:W-bp*2, height:H-bp*2, borderColor:C.gold, borderWidth:1.5, color:C.black, opacity:0 })
    corners.forEach(([cx,cy]) => p.drawRectangle({ x:cx-6, y:cy-6, width:12, height:12, color:C.crimson, rotate:degrees(45) }))
    return p
  }

  for (const para of paragraphs) {
    const lines = wrapText(para, dsReg, fSize, textW - 22)
    for (let i = 0; i < lines.length; i++) {
      if (curY < 130) { curPage = newPage(); curY = H - 60 }
      curPage.drawText(lines[i], { x: ml + (i===0 ? 20 : 0), y: curY, font: dsReg, size: fSize, color: C.inkBody })
      curY -= lineH
    }
    curY -= 10
  }

  // Signature
  if (curY < 210) { curPage = newPage(); curY = H - 80 }
  const sigRuleY = curY - 8
  curPage.drawLine({ start:{x:ml,y:sigRuleY}, end:{x:W*0.65,y:sigRuleY}, thickness:0.6, color:C.gold, opacity:0.3 })
  curPage.drawText('With all the love and magic of Christmas,', { x:ml, y:sigRuleY-20, font:dsReg, size:14, color:C.ink })
  curPage.drawText('Santa Claus', { x:ml, y:sigRuleY-74, font:dsBold, size:56, color:C.crimson })
  curPage.drawLine({ start:{x:ml,y:sigRuleY-80}, end:{x:ml+240,y:sigRuleY-80}, thickness:1, color:C.crimson, opacity:0.35 })
  curPage.drawText('Kris Kringle · Father Christmas · St. Nicholas', { x:ml, y:sigRuleY-96, font:dsReg, size:11.5, color:C.ink, opacity:0.7 })
  curPage.drawText('Chief Correspondent, North Pole Post Office', { x:ml, y:sigRuleY-112, font:dsReg, size:11.5, color:C.ink, opacity:0.65 })

  // Footer
  const ftY = 78
  curPage.drawLine({ start:{x:bp,y:ftY+32}, end:{x:W-bp,y:ftY+32}, thickness:1.5, color:C.gold, opacity:0.65 })
  curPage.drawLine({ start:{x:bp,y:ftY+29}, end:{x:W-bp,y:ftY+29}, thickness:0.5, color:C.gold, opacity:0.35 })

  // Postmarked box
  curPage.drawRectangle({ x:ml, y:ftY, width:190, height:26, borderColor:C.brown, borderWidth:1.1, color:C.black, opacity:0 })
  drawCentered(curPage, dsReg, 'Postmarked · North Pole · 2025', 11.5, ml*2+190, ftY+7, C.brown, 0.9)

  // Nice List Approved
  const nlX = W - mr - 190
  curPage.drawRectangle({ x:nlX, y:ftY-8, width:190, height:42, borderColor:C.green, borderWidth:2.4, color:C.black, opacity:0 })
  curPage.drawRectangle({ x:nlX+4, y:ftY-4, width:182, height:34, borderColor:C.green, borderWidth:0.6, color:C.black, opacity:0 })
  drawCentered(curPage, dsBold, 'Nice List',   14, nlX*2+190, ftY+16, C.green)
  drawCentered(curPage, dsBold, 'Approved ✓',  14, nlX*2+190, ftY,    C.green)

  // Footer band
  curPage.drawRectangle({ x:bp, y:bp, width:W-bp*2, height:48, color:C.crimsonDk })
  curPage.drawRectangle({ x:bp, y:bp+46, width:W-bp*2, height:2, color:C.gold })
  drawCentered(curPage, dsReg, 'SantasLetter.ai  ✦  Official Correspondence of the North Pole Post Office  ✦  Est. CCLXXX A.D.', 10.5, W, bp+16, C.gold)

  return Buffer.from(await doc.save())
}

// ── Helpers ────────────────────────────────────────────────────────────────

function drawCentered(page: PDFPage, font: PDFFont, text: string, size: number, containerWidth: number, y: number, color: ReturnType<typeof rgb>, opacity?: number) {
  const tw = font.widthOfTextAtSize(text, size)
  const opts: any = { x: (containerWidth - tw) / 2, y, font, size, color }
  if (opacity !== undefined) opts.opacity = opacity
  page.drawText(text, opts)
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(test, size) <= maxW) { cur = test }
    else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

function drawHolly(page: PDFPage, cx: number, cy: number) {
  page.drawEllipse({ x:cx-5, y:cy+3, xScale:12, yScale:7, color:rgb(0.173,0.353,0.106), rotate:degrees(-30) })
  page.drawEllipse({ x:cx+10, y:cy-2, xScale:12, yScale:7, color:rgb(0.118,0.251,0.071), rotate:degrees(22) })
  page.drawCircle({ x:cx+2, y:cy, size:5.5, color:rgb(0.545,0.102,0.102) })
  page.drawCircle({ x:cx+10, y:cy+5, size:4, color:rgb(0.482,0.071,0.071) })
  page.drawCircle({ x:cx+2, y:cy+7, size:3, color:rgb(0.545,0.102,0.102) })
}

function drawHollyMirror(page: PDFPage, cx: number, cy: number) {
  page.drawEllipse({ x:cx+5, y:cy+3, xScale:12, yScale:7, color:rgb(0.173,0.353,0.106), rotate:degrees(30) })
  page.drawEllipse({ x:cx-10, y:cy-2, xScale:12, yScale:7, color:rgb(0.118,0.251,0.071), rotate:degrees(-22) })
  page.drawCircle({ x:cx-2, y:cy, size:5.5, color:rgb(0.545,0.102,0.102) })
  page.drawCircle({ x:cx-10, y:cy+5, size:4, color:rgb(0.482,0.071,0.071) })
  page.drawCircle({ x:cx-2, y:cy+7, size:3, color:rgb(0.545,0.102,0.102) })
}

function drawDashedRect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>, opacity: number) {
  const d=3, g=3
  for (let px=x; px<x+w; px+=d+g) { page.drawLine({start:{x:px,y:y+h},end:{x:Math.min(px+d,x+w),y:y+h},thickness:1.2,color,opacity}) }
  for (let px=x; px<x+w; px+=d+g) { page.drawLine({start:{x:px,y},end:{x:Math.min(px+d,x+w),y},thickness:1.2,color,opacity}) }
  for (let py=y; py<y+h; py+=d+g) { page.drawLine({start:{x,y:py},end:{x,y:Math.min(py+d,y+h)},thickness:1.2,color,opacity}) }
  for (let py=y; py<y+h; py+=d+g) { page.drawLine({start:{x:x+w,y:py},end:{x:x+w,y:Math.min(py+d,y+h)},thickness:1.2,color,opacity}) }
}