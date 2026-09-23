import { StoredLetter, markPremiumPdfSent } from '@/lib/storage'
import { generatePremiumPDF } from '@/lib/pdf'
import { sendPremiumPDFEmail } from '@/lib/resend'

// Premium PDF delivery, shared by the two things that can cause it: a paid
// Stripe checkout and a referral grant.
//
// Deliberately holds no opinion about idempotency, because the two callers do
// not share one. The webhook guards on webhook_sessions.premium_pdf_sent_at, so
// a Stripe redelivery of the same session is a no-op while a genuine second
// purchase still delivers. The referral grant guards on
// letters.referral_premium_granted_at, claimed with a conditional update. Baking
// either rule in here would impose it on the other caller and reintroduce the
// cross-purchase suppression that the session-scoped guard exists to avoid.
//
// The letters.premium_pdf_sent_at stamp written here is a record of the most
// recent send for a letter, not a guard. Nothing reads it to decide whether to
// deliver.
export async function deliverPremiumPdf(
  letter: StoredLetter,
  recipientEmail: string
): Promise<void> {
  const pdfBuffer = await generatePremiumPDF(letter.child, letter.letterText)
  await sendPremiumPDFEmail(recipientEmail, letter.child.name, pdfBuffer)
  await markPremiumPdfSent(letter.id)
}
