import { NextRequest, NextResponse } from 'next/server'
import { generatePremiumPDF } from '@/lib/pdf'
import { sendPremiumPDFEmail } from '@/lib/resend'

// TEMPORARY diagnostic route — remove after confirming PDF delivery works
// Hit: https://santasletter.ai/api/test-pdf?email=your@email.com

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Add ?email=your@email.com to the URL' }, { status: 400 })
  }

  const steps: string[] = []

  try {
    steps.push('1. Generating PDF...')
    const pdfBuffer = await generatePremiumPDF(
      {
        name: 'Oliver',
        age: '7',
        wishes: ['LEGO set', 'toy dinosaur'],
        behaviorRating: 9,
        behaviorNotes: 'Kind to his sister',
        parentNotes: '',
        recipientEmail: email,
      },
      `Dear Oliver,\n\nWhat a magical year it has been at the North Pole! The elves have been watching with great delight as you showed such kindness to your little sister.\n\nYou have been wonderfully thoughtful this year, and your curiosity about the world makes Mrs. Claus smile every morning over her cocoa.\n\nNow, about those wishes — a LEGO set! The elves do love a good building challenge. And a toy dinosaur? Rudolph was rather offended when I told him, but I assured him reindeer are far more useful.\n\nBelieve in the magic of giving, not just receiving,\nAnd Christmas will always be worth believing.\n\nP.S. The mince pie you left last year had just the right amount of cinnamon. Well done.`
    )
    steps.push(`2. PDF generated — ${pdfBuffer.length} bytes ✅`)

    steps.push('3. Sending email via Resend...')
    await sendPremiumPDFEmail(email, 'Oliver', pdfBuffer)
    steps.push(`4. Email sent to ${email} ✅`)

    return NextResponse.json({ success: true, steps })

  } catch (err: any) {
    return NextResponse.json({ success: false, steps, error: err.message }, { status: 500 })
  }
}