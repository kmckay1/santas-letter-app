// Shared footer content for every outbound email. Task 11 (email compliance).

export const COMPANY_POSTAL_ADDRESS =
  'SantasLetter.ai · 10331 Memory Park Ave · Mission Hills, CA 91345'

export function footerHtml(unsubscribeUrl: string): string {
  return `
    <p style="text-align:center;margin-top:24px;font-size:11px;color:rgba(245,234,216,0.25);">
      ${COMPANY_POSTAL_ADDRESS}<br>
      <a href="${unsubscribeUrl}" style="color:rgba(245,234,216,0.3);">Unsubscribe</a>
    </p>
  `
}
