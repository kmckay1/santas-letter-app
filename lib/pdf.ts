import PDFDocument from 'pdfkit'
import { ChildInfo } from '@/types'

// Color palette
const COLORS = {
  crimson:     '#8B1A1A',
  crimsonDark: '#5a0a0a',
  gold:        '#C8922A',
  goldLight:   '#d4aa5a',
  parchment:   '#fdf8e8',
  parchmentDark: '#f5edd0',
  inkDark:     '#1a0a02',
  inkMid:      '#2c1a0e',
  inkLight:    'rgba(44,26,14,0.55)',
  white:       '#ffffff',
}

export async function generatePremiumPDF(
  child: ChildInfo,
  letterText: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 80, right: 80 },
      info: {
        Title: `A Letter from Santa for ${child.name}`,
        Author: 'Santa Claus — North Pole Post Office',
        Subject: 'Official Christmas Correspondence',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width   // 612
    const H = doc.page.height  // 792
    const ml = doc.page.margins.left
    const mr = doc.page.margins.right
    const textW = W - ml - mr

    // ── Background ────────────────────────────────────────────────────────────
    // Warm parchment base
    doc.rect(0, 0, W, H).fill(COLORS.parchment)

    // Subtle aged texture — horizontal grain lines
    doc.save()
    doc.opacity(0.04)
    for (let y = 0; y < H; y += 4) {
      doc.moveTo(0, y).lineTo(W, y)
        .stroke('#8B5E3C')
    }
    doc.restore()

    // Corner vignette (dark edges, warm parchment center)
    const vigGrad = doc.linearGradient(0, 0, 0, H)
    vigGrad.stop(0, '#c8a060', 0.18)
    vigGrad.stop(0.12, COLORS.parchment, 0)
    vigGrad.stop(0.88, COLORS.parchment, 0)
    vigGrad.stop(1, '#c8a060', 0.18)
    doc.rect(0, 0, W, H).fill(vigGrad)

    // ── Decorative border ─────────────────────────────────────────────────────
    const bPad = 22
    // Outer border
    doc.rect(bPad, bPad, W - bPad * 2, H - bPad * 2)
      .lineWidth(2.5)
      .strokeColor(COLORS.gold, 0.7)
      .stroke()
    // Inner border
    doc.rect(bPad + 5, bPad + 5, W - (bPad + 5) * 2, H - (bPad + 5) * 2)
      .lineWidth(0.5)
      .strokeColor(COLORS.gold, 0.35)
      .stroke()

    // Corner ornaments — diamond shapes
    const corners = [
      [bPad, bPad],
      [W - bPad, bPad],
      [bPad, H - bPad],
      [W - bPad, H - bPad],
    ] as [number, number][]

    corners.forEach(([cx, cy]) => {
      const s = 7
      doc.save()
      doc.translate(cx, cy)
      doc.polygon([0, -s], [s, 0], [0, s], [-s, 0])
        .fillAndStroke(COLORS.gold, COLORS.gold)
      doc.restore()
    })

    // ── Top header band ───────────────────────────────────────────────────────
    const headerY = 50
    // Thin decorative rules
    doc.moveTo(ml, headerY).lineTo(W - mr, headerY)
      .lineWidth(0.5).strokeColor(COLORS.gold, 0.4).stroke()
    doc.moveTo(ml, headerY + 2).lineTo(W - mr, headerY + 2)
      .lineWidth(1.5).strokeColor(COLORS.gold, 0.6).stroke()

    // Centered snowflake / star ornament
    drawStar(doc, W / 2, headerY + 18, 10, COLORS.gold)

    doc.moveTo(ml, headerY + 36).lineTo(W - mr, headerY + 36)
      .lineWidth(1.5).strokeColor(COLORS.gold, 0.6).stroke()
    doc.moveTo(ml, headerY + 38).lineTo(W - mr, headerY + 38)
      .lineWidth(0.5).strokeColor(COLORS.gold, 0.4).stroke()

    // Office heading
    doc.font('Times-Roman')
      .fontSize(8)
      .fillColor(COLORS.inkLight)
      .fillOpacity(0.6)
      .text('THE OFFICIAL NORTH POLE POST OFFICE', 0, headerY + 44, {
        align: 'center', characterSpacing: 2.5,
      })
    doc.fillOpacity(1)

    // "EST. CCLXXX A.D." with small caps feel
    doc.font('Times-Italic')
      .fontSize(7)
      .fillColor(COLORS.gold)
      .fillOpacity(0.7)
      .text('Est. Anno Domini CCLXXX  ✦  Sanctus Nicolaus, Rector', 0, headerY + 56, {
        align: 'center', characterSpacing: 1,
      })
    doc.fillOpacity(1)

    // ── Wax seal ──────────────────────────────────────────────────────────────
    const sealX = W / 2
    const sealY = 165
    const sealR = 32

    // Drop shadow
    doc.circle(sealX + 2, sealY + 3, sealR)
      .fill('#000000').fillOpacity(0.18)
    doc.fillOpacity(1)

    // Main seal body gradient
    doc.circle(sealX, sealY, sealR).fill(COLORS.crimsonDark)
    // Highlight
    doc.circle(sealX - 8, sealY - 8, 14).fill(COLORS.crimson)
    // Edge
    doc.circle(sealX, sealY, sealR)
      .lineWidth(1.5).strokeColor('#3a0505', 0.8).stroke()
    // Inner ring
    doc.circle(sealX, sealY, sealR - 6)
      .lineWidth(0.6).strokeColor('#ffb090', 0.25).stroke()

    // "S" monogram
    doc.font('Times-BoldItalic')
      .fontSize(38)
      .fillColor('#ffe8d8')
      .fillOpacity(0.95)
      .text('S', sealX - 11, sealY - 19)
    doc.fillOpacity(1)

    // ── Salutation ────────────────────────────────────────────────────────────
    const bodyTop = sealY + sealR + 28

    // Thin rule
    doc.moveTo(ml, bodyTop - 4).lineTo(W - mr, bodyTop - 4)
      .lineWidth(0.5).strokeColor(COLORS.gold, 0.25).stroke()

    doc.font('Times-Roman')
      .fontSize(20)
      .fillColor(COLORS.inkDark)
      .text(`Dear ${child.name},`, ml, bodyTop)

    // Decorative rule under salutation
    doc.moveTo(ml, bodyTop + 30).lineTo(W - mr, bodyTop + 30)
      .lineWidth(0.8).strokeColor(COLORS.gold, 0.35).stroke()

    // ── Letter body ───────────────────────────────────────────────────────────
    const bodyTextTop = bodyTop + 42
    const paragraphs = letterText
      .split('\n\n')
      .map(p => p.replace(/\*/g, '').replace(/\n/g, ' ').trim())
      .filter(p => p.length > 0)

    doc.font('Times-Roman')
      .fontSize(12.5)
      .fillColor(COLORS.inkMid)
      .lineGap(3)

    let currentY = bodyTextTop

    for (const para of paragraphs) {
      if (currentY > H - 200) {
        doc.addPage()
        currentY = 80
        // Minimal border on continuation pages
        doc.rect(bPad, bPad, W - bPad * 2, H - bPad * 2)
          .lineWidth(1.5).strokeColor(COLORS.gold, 0.4).stroke()
      }
      doc.text(para, ml, currentY, {
        width: textW,
        align: 'justify',
        indent: 28,
      })
      currentY = doc.y + 14
    }

    // ── Signature ─────────────────────────────────────────────────────────────
    const sigTop = Math.min(currentY + 12, H - 160)
    doc.moveTo(ml, sigTop).lineTo(W - mr, sigTop)
      .lineWidth(0.5).strokeColor(COLORS.gold, 0.2).stroke()

    doc.font('Times-Italic')
      .fontSize(11)
      .fillColor(COLORS.inkLight)
      .fillOpacity(0.7)
      .text('With all the love and magic of Christmas,', ml, sigTop + 12)
    doc.fillOpacity(1)

    // Santa signature in large italic
    doc.font('Times-BoldItalic')
      .fontSize(42)
      .fillColor(COLORS.crimson)
      .text('Santa Claus', ml, sigTop + 28)

    // Underline flourish
    const sigLineY = doc.y + 2
    doc.moveTo(ml, sigLineY).lineTo(ml + 220, sigLineY)
      .lineWidth(1).strokeColor(COLORS.crimson, 0.35).stroke()

    // ── Bottom ornament ───────────────────────────────────────────────────────
    const footerY = H - 52
    doc.moveTo(ml, footerY).lineTo(W - mr, footerY)
      .lineWidth(1.5).strokeColor(COLORS.gold, 0.5).stroke()
    doc.moveTo(ml, footerY + 2).lineTo(W - mr, footerY + 2)
      .lineWidth(0.5).strokeColor(COLORS.gold, 0.3).stroke()

    drawStar(doc, W / 2, footerY + 12, 6, COLORS.gold)

    doc.font('Times-Roman')
      .fontSize(7)
      .fillColor(COLORS.gold)
      .fillOpacity(0.55)
      .text('SantasLetter.ai  ✦  Official Correspondence of the North Pole Post Office  ✦  Est. CCLXXX A.D.', 0, footerY + 22, {
        align: 'center', characterSpacing: 0.8,
      })
    doc.fillOpacity(1)

    doc.end()
  })
}

// Draw an 8-pointed star / snowflake ornament
function drawStar(
  doc: PDFKit.PDFDocument,
  cx: number, cy: number,
  size: number,
  color: string
) {
  doc.save()
  doc.fillColor(color).fillOpacity(0.75)
  const points = 8
  doc.moveTo(cx, cy - size)
  for (let i = 1; i <= points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2
    const r = i % 2 === 0 ? size : size * 0.42
    doc.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
  }
  doc.closePath().fill()
  doc.restore()
}