import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { ChildInfo } from '@/types'

const c = {
  parchment:    rgb(0.992, 0.973, 0.910),
  parchmentDk:  rgb(0.973, 0.941, 0.847),
  gold:         rgb(0.784, 0.573, 0.165),
  goldLight:    rgb(0.831, 0.667, 0.353),
  crimson:      rgb(0.545, 0.102, 0.102),
  crimsonDk:    rgb(0.353, 0.039, 0.039),
  ink:          rgb(0.102, 0.031, 0.008),
  inkMid:       rgb(0.173, 0.102, 0.055),
  inkLight:     rgb(0.400, 0.280, 0.180),
  white:        rgb(1, 1, 1),
  black:        rgb(0, 0, 0),
}

export async function generatePremiumPDF(
  child: ChildInfo,
  letterText: string
): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`A Letter from Santa for ${child.name}`)
  doc.setAuthor('Santa Claus — North Pole Post Office')
  doc.setSubject('Official Christmas Correspondence')

  const page = doc.addPage([612, 792])
  const { width, height } = page.getSize()

  const fontSerif       = await doc.embedFont(StandardFonts.TimesRoman)
  const fontSerifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic)
  const fontSerifBI     = await doc.embedFont(StandardFonts.TimesRomanBoldItalic)

  const ml = 72
  const mr = 72
  const textW = width - ml - mr

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: c.parchment })
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: c.parchmentDk, opacity: 0.5 })
  page.drawRectangle({ x: 0, y: 0, width, height: 80, color: c.parchmentDk, opacity: 0.5 })

  // Outer gold border
  const bp = 24
  page.drawRectangle({ x: bp, y: bp, width: width - bp * 2, height: height - bp * 2,
    borderColor: c.gold, borderWidth: 2, color: rgb(0,0,0), opacity: 0 })
  // Inner thinner border
  const bp2 = bp + 6
  page.drawRectangle({ x: bp2, y: bp2, width: width - bp2 * 2, height: height - bp2 * 2,
    borderColor: c.goldLight, borderWidth: 0.5, color: rgb(0,0,0), opacity: 0 })

  // Corner diamonds
  const corners: [number, number][] = [
    [bp, bp], [width - bp, bp], [bp, height - bp], [width - bp, height - bp]
  ]
  corners.forEach(([cx, cy]) => {
    page.drawRectangle({ x: cx - 5, y: cy - 5, width: 10, height: 10,
      color: c.gold, rotate: degrees(45) })
  })

  // Header rules
  const headerY = height - 58
  page.drawLine({ start: { x: ml, y: headerY }, end: { x: width - mr, y: headerY }, thickness: 1.5, color: c.gold, opacity: 0.7 })
  page.drawLine({ start: { x: ml, y: headerY - 3 }, end: { x: width - mr, y: headerY - 3 }, thickness: 0.4, color: c.gold, opacity: 0.4 })
  page.drawCircle({ x: width / 2, y: headerY - 16, size: 8, color: c.gold, opacity: 0.75 })
  page.drawLine({ start: { x: ml, y: headerY - 32 }, end: { x: width - mr, y: headerY - 32 }, thickness: 1.5, color: c.gold, opacity: 0.7 })
  page.drawLine({ start: { x: ml, y: headerY - 35 }, end: { x: width - mr, y: headerY - 35 }, thickness: 0.4, color: c.gold, opacity: 0.4 })

  // Office heading
  const officeText = 'THE OFFICIAL NORTH POLE POST OFFICE'
  const officeW = fontSerif.widthOfTextAtSize(officeText, 7.5)
  page.drawText(officeText, { x: (width - officeW) / 2, y: headerY - 46,
    font: fontSerif, size: 7.5, color: c.inkLight, opacity: 0.65 })

  const estText = 'Est. Anno Domini CCLXXX  ~  Sanctus Nicolaus, Rector'
  const estW = fontSerifItalic.widthOfTextAtSize(estText, 7)
  page.drawText(estText, { x: (width - estW) / 2, y: headerY - 57,
    font: fontSerifItalic, size: 7, color: c.gold, opacity: 0.65 })

  // Wax seal
  const sealX = width / 2
  const sealY = height - 140
  const sealR = 30
  page.drawCircle({ x: sealX + 2, y: sealY - 3, size: sealR, color: c.black, opacity: 0.15 })
  page.drawCircle({ x: sealX, y: sealY, size: sealR, color: c.crimsonDk })
  page.drawCircle({ x: sealX - 7, y: sealY + 7, size: 13, color: c.crimson, opacity: 0.8 })
  const sText = 'S'
  const sSize = 36
  const sW = fontSerifBI.widthOfTextAtSize(sText, sSize)
  page.drawText(sText, { x: sealX - sW / 2, y: sealY - sSize * 0.35,
    font: fontSerifBI, size: sSize, color: rgb(1, 0.91, 0.85), opacity: 0.95 })

  // Salutation
  const bodyTop = sealY - sealR - 22
  page.drawLine({ start: { x: ml, y: bodyTop + 4 }, end: { x: width - mr, y: bodyTop + 4 }, thickness: 0.4, color: c.gold, opacity: 0.25 })
  page.drawText(`Dear ${child.name},`, { x: ml, y: bodyTop - 6, font: fontSerif, size: 20, color: c.ink })
  page.drawLine({ start: { x: ml, y: bodyTop - 22 }, end: { x: width - mr, y: bodyTop - 22 }, thickness: 0.8, color: c.gold, opacity: 0.35 })

  // Letter body
  const paragraphs = letterText
    .split('\n\n')
    .map(p => p.replace(/\*/g, '').replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0)

  const fontSize = 12
  const lineHeight = fontSize * 1.75
  let curY = bodyTop - 42

  for (const para of paragraphs) {
    const lines = wrapText(para, fontSerif, fontSize, textW)
    for (let i = 0; i < lines.length; i++) {
      if (curY < 160) break
      page.drawText(lines[i], {
        x: ml + (i === 0 ? 24 : 0),
        y: curY,
        font: fontSerif, size: fontSize, color: c.inkMid,
      })
      curY -= lineHeight
    }
    curY -= 8
  }

  // Signature
  const sigY = Math.min(curY - 8, 200)
  page.drawLine({ start: { x: ml, y: sigY + 14 }, end: { x: width - mr, y: sigY + 14 }, thickness: 0.4, color: c.gold, opacity: 0.2 })
  page.drawText('With all the love and magic of Christmas,', { x: ml, y: sigY,
    font: fontSerifItalic, size: 11, color: c.inkLight, opacity: 0.75 })
  page.drawText('Santa Claus', { x: ml, y: sigY - 38, font: fontSerifBI, size: 40, color: c.crimson })
  page.drawLine({ start: { x: ml, y: sigY - 44 }, end: { x: ml + 210, y: sigY - 44 }, thickness: 1, color: c.crimson, opacity: 0.3 })

  // Footer
  const footerY = 44
  page.drawLine({ start: { x: ml, y: footerY + 14 }, end: { x: width - mr, y: footerY + 14 }, thickness: 1.5, color: c.gold, opacity: 0.5 })
  page.drawCircle({ x: width / 2, y: footerY + 4, size: 4, color: c.gold, opacity: 0.55 })
  const footerText = 'SantasLetter.ai  ~  Official Correspondence of the North Pole Post Office'
  const footerW = fontSerif.widthOfTextAtSize(footerText, 7)
  page.drawText(footerText, { x: (width - footerW) / 2, y: footerY - 8,
    font: fontSerif, size: 7, color: c.gold, opacity: 0.5 })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}