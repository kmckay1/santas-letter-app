import { ChildInfo } from '@/types'
import { createClient } from '@supabase/supabase-js'
import { MailAddress, buildLetterHtml } from '@/lib/letter-html'

// Stannp is region-partitioned and API keys are bound to the region that issued
// them: a key from the EU stack (api-eu1 / app-eu1) will not authenticate here.
// This account is US, so all calls go to api-us1.
const STANNP_API_URL = 'https://api-us1.stannp.com/v1'

// Physical letters are 8.5x11in; buildLetterHtml emits two such pages.
const PDFSHIFT_API_URL = 'https://api.pdfshift.io/v3/convert/pdf'

// Reuses the bucket the Lob flow already writes to, so no new Supabase setup is
// required mid-migration. Rename alongside the lob_letter_id column later.
const STORAGE_BUCKET = 'lob-letters'

// Stannp only validates US and GB addresses. Real addresses in DE, FR and AU all
// come back is_valid:false, and CA street lines are not checked at all (a nonsense
// street passes), so validating those countries would reject good orders while
// giving false confidence about Canadian ones. Anything outside this set is
// treated as deliverable and left to Stannp's own address handling at post time.
const VALIDATABLE_COUNTRIES = new Set(['US', 'GB'])

const VALIDATION_TIMEOUT_MS = 10_000

/**
 * `ok` answers one question: is it safe to put this in the mail?
 * It is false ONLY when Stannp positively reported the address as undeliverable.
 * Every other outcome — unsupported country, timeout, HTTP error, malformed
 * response, missing key — fails open, because a validation outage must never
 * masquerade as a bad address and strand a paid order.
 */
export type AddressCheck =
  | { ok: true; reason: 'valid' | 'unsupported-country' | 'validation-unavailable'; detail?: string }
  | { ok: false; reason: 'invalid' }

export async function validateAddress(toAddress: MailAddress): Promise<AddressCheck> {
  const country = (toAddress.address_country || '').toUpperCase()

  if (!VALIDATABLE_COUNTRIES.has(country)) {
    return { ok: true, reason: 'unsupported-country', detail: country || 'unknown' }
  }

  const apiKey = process.env.STANNP_API_KEY
  if (!apiKey) {
    return { ok: true, reason: 'validation-unavailable', detail: 'STANNP_API_KEY not set' }
  }

  const form = new URLSearchParams({
    address1: toAddress.address_line1,
    city: toAddress.address_city,
    state: toAddress.address_state,
    zipcode: toAddress.address_zip,
    country,
  })
  if (toAddress.address_line2) {
    form.set('address2', toAddress.address_line2)
  }

  try {
    const response = await fetch(`${STANNP_API_URL}/addresses/validate`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
    })

    if (!response.ok) {
      return { ok: true, reason: 'validation-unavailable', detail: `HTTP ${response.status}` }
    }

    const payload = await response.json().catch(() => null)
    if (!payload?.success) {
      return { ok: true, reason: 'validation-unavailable', detail: 'success:false from Stannp' }
    }

    // Only a definitive false blocks the mail; anything else is inconclusive.
    if (payload.data?.is_valid === false) {
      return { ok: false, reason: 'invalid' }
    }
    if (payload.data?.is_valid === true) {
      return { ok: true, reason: 'valid' }
    }
    return { ok: true, reason: 'validation-unavailable', detail: 'is_valid missing from response' }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: true, reason: 'validation-unavailable', detail }
  }
}

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Stannp addresses recipients by first/last name, while the Lob-era MailAddress
 * carries a single `name` (Stripe shipping name, falling back to the child's).
 * Split on the final space so multi-word first names stay intact.
 */
function splitName(name: string): { firstname: string; lastname: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstname: '', lastname: '' }
  if (parts.length === 1) return { firstname: parts[0], lastname: '' }
  return {
    firstname: parts.slice(0, -1).join(' '),
    lastname: parts[parts.length - 1],
  }
}

/**
 * Stannp's letters/create response carries no delivery estimate, but the Lob
 * signature promised one. Approximate USPS First Class at five business days so
 * the return shape stays stable for callers.
 */
function estimateDelivery(businessDays = 5): string {
  const date = new Date()
  let remaining = businessDays
  while (remaining > 0) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) remaining--
  }
  return date.toISOString().split('T')[0]
}

/**
 * Stannp requires a real PDF; Lob accepted a remote HTML URL. Render the same
 * letter HTML through PDFShift (already used for the premium email PDF).
 */
async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY env var not set')

  const response = await fetch(PDFSHIFT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: html,
      format: 'Letter',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      use_print: false,
      landscape: false,
      // The letter leans on Google Fonts (Dancing Script signature, Playfair
      // headings); give them time to load before the page is rasterised.
      delay: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PDFShift error ${response.status}: ${error}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function uploadPdfToSupabase(pdf: Buffer, fileName: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, pdf, { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error('Supabase upload error: ' + error.message)
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
  return data.publicUrl
}

export async function sendPhysicalLetter(
  toAddress: MailAddress,
  child: ChildInfo,
  letter: { content: string; childName: string; createdAt: string }
): Promise<{ id: string; expectedDelivery: string }> {
  const apiKey = process.env.STANNP_API_KEY
  if (!apiKey) throw new Error('STANNP_API_KEY env var not set')

  const html = buildLetterHtml(child, letter.content, toAddress)
  const pdf = await renderHtmlToPdf(html)
  const slug = child.name.toLowerCase().replace(/\s+/g, '-')
  // The cron sends several letters concurrently, so a timestamp alone is not
  // unique: two children with the same name in one batch can land on the same
  // millisecond, and the upload uses upsert, which would silently overwrite the
  // first PDF and mail one child the other's letter.
  const suffix = Math.random().toString(36).slice(2, 8)
  const fileUrl = await uploadPdfToSupabase(pdf, `letter-${slug}-${Date.now()}-${suffix}.pdf`)

  const { firstname, lastname } = splitName(toAddress.name)

  // Form-encoded, not JSON - Stannp's v1 API takes application/x-www-form-urlencoded.
  const form = new URLSearchParams({
    test: process.env.STANNP_TEST_MODE === 'true' ? 'true' : 'false',
    file: fileUrl,
    'recipient[firstname]': firstname,
    'recipient[lastname]': lastname,
    'recipient[address1]': toAddress.address_line1,
    'recipient[city]': toAddress.address_city,
    // Stannp's field for the US state is `county` (it also accepts `state` as
    // an alias); there is no dedicated state parameter.
    'recipient[county]': toAddress.address_state,
    'recipient[zipcode]': toAddress.address_zip,
    'recipient[country]': toAddress.address_country,
    // Lob sent double_sided: false, so keep one page per sheet.
    duplex: 'false',
    // Matches Lob's behaviour of mailing without a hard address-verification
    // gate, so a paid order is never silently dropped.
    post_unverified: 'true',
    // Restores the postage class Lob used (mail_type: usps_first_class).
    // Without it Stannp sends standard post, which is slower and would miss the
    // Christmas delivery window. Costs more per piece than standard.
    addons: 'FIRST_CLASS',
    tags: 'santas-letter',
  })

  if (toAddress.address_line2) {
    form.set('recipient[address2]', toAddress.address_line2)
  }

  const response = await fetch(`${STANNP_API_URL}/letters/create`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  const payload = await response.json().catch(() => null)

  // Stannp reports validation failures as success:false on a 200, so the HTTP
  // status alone is not enough to tell a real send from a rejection.
  if (!response.ok || !payload?.success) {
    throw new Error(`Stannp API error: ${JSON.stringify(payload ?? { status: response.status })}`)
  }

  return {
    id: String(payload.data.id),
    expectedDelivery: estimateDelivery(),
  }
}
