import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { isUnsubscribed } from '@/lib/unsubscribe'
import { renderPromoEmail, PromoRecipient } from '@/lib/promo-email'
import { sendAlert } from '@/lib/alert'

// One-shot promotional email. Not a scheduled cron: run it by hand.
//
//   Dry run (default, sends nothing):
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//       "https://www.santasletter.ai/api/admin/send-promo?campaign=posted-letters-2026"
//
//   Send:
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//       "https://www.santasletter.ai/api/admin/send-promo?campaign=posted-letters-2026&send=true"
//
// Who is mailable, computed fresh at request time. This is marketing, so it
// follows the privacy policy: only people who opted in.
//   - everyone in `subscribers` (they signed up to an email list), plus
//   - letters with marketing_consent = true (they ticked the box on /create),
//   less anyone unsubscribed in either table, anyone with a test row
//   (is_test), known typo domains that can only bounce, and anyone who has
//   already bought a posted letter (the email pitches exactly that).
//
// Sends are claimed in `promo_sends` before they go out (see
// supabase/promo_sends.sql), so a re-run of the same campaign resumes rather
// than double-sending.

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Resend's default limit is 2 requests per second.
const SEND_INTERVAL_MS = 600
// Stop claiming new recipients with room to spare before maxDuration. Anyone
// not reached is picked up by running the same campaign again.
const TIME_BUDGET_MS = 240_000
const PAGE_SIZE = 1000
const CAMPAIGN_PATTERN = /^[a-z0-9-]{3,64}$/

// Domains that are misspellings of real providers. Matched by domain so no
// individual customer's address has to appear in this (public) repository.
const TYPO_DOMAINS = new Set(['gmil.com'])

type Source = 'subscriber' | 'letter' | 'both'

interface Candidate {
  email: string
  inSubscribers: boolean
  letterConsent: boolean
  unsubscribed: boolean
  isTest: boolean
  // Already owns the posted letter this email offers: a letter at tier physical
  // or bundle, or any order in scheduled_letters (which also covers physical
  // orders whose address is still being confirmed and so not yet marked).
  boughtPosted: boolean
  latestLetter: { id: string; childName: string | null; upgradeToken: string | null; createdAt: string } | null
}

interface Recipient extends PromoRecipient {
  source: Source
  letterId: string | null
  alreadySent: boolean
}

function getSupabaseAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function normalise(email: string): string {
  return email.toLowerCase().trim()
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchAll<T>(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: 'letters' | 'subscribers',
  columns: string
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${table} query failed: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

async function buildList(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const letters = await fetchAll<{
    id: string; email: string; child_name: string | null; upgrade_token: string | null
    created_at: string; unsubscribed: boolean | null; is_test: boolean | null; marketing_consent: boolean | null
    tier: string | null
  }>(supabase, 'letters', 'id,email,child_name,upgrade_token,created_at,unsubscribed,is_test,marketing_consent,tier')

  const subscribers = await fetchAll<{
    email: string; unsubscribed: boolean | null; is_test: boolean | null
  }>(supabase, 'subscribers', 'email,unsubscribed,is_test')

  // Physical orders. Only addresses that already appear in letters or
  // subscribers matter, so these never add a recipient, only exclude one.
  const postedBuyers = new Set<string>()
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('scheduled_letters')
      .select('recipient_email')
      .not('recipient_email', 'is', null)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`scheduled_letters query failed: ${error.message}`)
    for (const r of data ?? []) postedBuyers.add(normalise(r.recipient_email))
    if (!data || data.length < PAGE_SIZE) break
  }

  const byEmail = new Map<string, Candidate>()
  const get = (raw: string) => {
    const email = normalise(raw)
    let c = byEmail.get(email)
    if (!c) {
      c = { email, inSubscribers: false, letterConsent: false, unsubscribed: false, isTest: false, boughtPosted: false, latestLetter: null }
      byEmail.set(email, c)
    }
    return c
  }

  for (const s of subscribers) {
    const c = get(s.email)
    c.inSubscribers = true
    if (s.unsubscribed) c.unsubscribed = true
    if (s.is_test) c.isTest = true
  }

  // Letters arrive oldest first, so the last one seen per address is the newest
  // and is what personalises the email.
  for (const l of letters) {
    const c = get(l.email)
    if (l.marketing_consent === true) c.letterConsent = true
    if (l.unsubscribed) c.unsubscribed = true
    if (l.is_test) c.isTest = true
    if (l.tier === 'physical' || l.tier === 'bundle') c.boughtPosted = true
    c.latestLetter = { id: l.id, childName: l.child_name, upgradeToken: l.upgrade_token, createdAt: l.created_at }
  }

  for (const c of Array.from(byEmail.values())) {
    if (postedBuyers.has(c.email)) c.boughtPosted = true
  }

  const eligible: Candidate[] = []
  const excluded: { email: string; reason: string }[] = []
  for (const c of Array.from(byEmail.values())) {
    const domain = c.email.split('@')[1] ?? ''
    // Order matters only for which reason is reported; every one excludes.
    if (c.isTest) excluded.push({ email: c.email, reason: 'test_row' })
    else if (TYPO_DOMAINS.has(domain)) excluded.push({ email: c.email, reason: 'typo_domain' })
    else if (c.unsubscribed) excluded.push({ email: c.email, reason: 'unsubscribed' })
    else if (c.boughtPosted) excluded.push({ email: c.email, reason: 'already_bought_posted_letter' })
    else if (!c.inSubscribers && !c.letterConsent) excluded.push({ email: c.email, reason: 'no_marketing_consent' })
    else eligible.push(c)
  }

  return { eligible, excluded }
}

// Returns the set of addresses already sent for this campaign, or null when the
// promo_sends table does not exist yet.
async function loadSent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  campaign: string
): Promise<Set<string> | null> {
  const sent = new Set<string>()
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('promo_sends')
      .select('email')
      .eq('campaign', campaign)
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') return null
      throw new Error(`promo_sends query failed: ${error.message}`)
    }
    for (const r of data ?? []) sent.add(normalise(r.email))
    if (!data || data.length < PAGE_SIZE) break
  }
  return sent
}

function toRecipient(c: Candidate, sent: Set<string> | null): Recipient {
  const source: Source = c.inSubscribers && c.letterConsent ? 'both' : c.inSubscribers ? 'subscriber' : 'letter'
  return {
    email: c.email,
    childName: c.latestLetter?.childName ?? null,
    upgradeToken: c.latestLetter?.upgradeToken ?? null,
    letterId: c.latestLetter?.id ?? null,
    source,
    alreadySent: sent?.has(c.email) ?? false,
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaign = req.nextUrl.searchParams.get('campaign') ?? ''
  const send = req.nextUrl.searchParams.get('send') === 'true'
  if (!CAMPAIGN_PATTERN.test(campaign)) {
    return NextResponse.json(
      { error: 'campaign is required: 3-64 characters of a-z, 0-9 and hyphens' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  let eligible: Candidate[]
  let excluded: { email: string; reason: string }[]
  let sent: Set<string> | null
  try {
    ;({ eligible, excluded } = await buildList(supabase))
    sent = await loadSent(supabase, campaign)
  } catch (err) {
    console.error('send-promo: building the list failed:', err)
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Could not build the mailable list' }, { status: 500 })
  }

  const recipients = eligible.map(c => toRecipient(c, sent))

  // ---- Dry run: report exactly what a send would do, and send nothing. ----
  if (!send) {
    // One rendered sample of each version, so both can be reviewed in one call.
    const unsent = recipients.filter(r => !r.alreadySent)
    const personalised = unsent.find(r => r.childName?.trim()) ?? null
    const generic = unsent.find(r => !r.childName?.trim()) ?? null
    return NextResponse.json({
      mode: 'dry-run',
      campaign,
      promoSendsTable: sent === null ? 'missing: run supabase/promo_sends.sql before sending' : 'ok',
      counts: {
        recipients: recipients.length,
        alreadySent: recipients.filter(r => r.alreadySent).length,
        toSend: recipients.filter(r => !r.alreadySent).length,
        excluded: excluded.length,
      },
      recipients: recipients.map(r => ({
        email: r.email,
        source: r.source,
        childName: r.childName ?? null,
        letterId: r.letterId,
        alreadySent: r.alreadySent,
      })),
      excluded,
      samples: {
        personalised: personalised ? renderPromoEmail(personalised) : null,
        generic: generic ? renderPromoEmail(generic) : null,
      },
    })
  }

  // ---- Send ----
  if (sent === null) {
    return NextResponse.json(
      { error: 'promo_sends table is missing: run supabase/promo_sends.sql first' },
      { status: 409 }
    )
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const startedAt = Date.now()
  const result = {
    mode: 'send' as const,
    campaign,
    sent: 0,
    skippedAlreadySent: 0,
    skippedUnsubscribed: 0,
    failed: 0,
    notReached: 0,
    failures: [] as { email: string; error: string }[],
  }

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]
    if (r.alreadySent) { result.skippedAlreadySent++; continue }
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      result.notReached = recipients.slice(i).filter(x => !x.alreadySent).length
      break
    }

    try {
      // Re-check right before sending: someone may have unsubscribed since the
      // list was built. isUnsubscribed throws when it cannot check, which lands
      // in the catch below and skips this person rather than mailing them.
      if (await isUnsubscribed(r.email)) { result.skippedUnsubscribed++; continue }

      // Claim before sending. A duplicate key means another run already has
      // this recipient, so there is nothing to do.
      const { error: claimError } = await supabase
        .from('promo_sends')
        .insert({ campaign, email: r.email })
      if (claimError) {
        if (claimError.code === '23505') { result.skippedAlreadySent++; continue }
        throw new Error(`claim failed: ${claimError.message}`)
      }

      const email = renderPromoEmail(r)
      const { error: sendError } = await resend.emails.send({
        from: 'Santa Claus <santa@santasletter.ai>',
        to: email.to,
        subject: email.subject,
        headers: email.headers,
        html: email.html,
      })

      if (sendError) {
        // Release the claim so a re-run can try this person again.
        await supabase.from('promo_sends').delete().eq('campaign', campaign).eq('email', r.email)
        throw new Error(`Resend: ${sendError.message}`)
      }

      result.sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`send-promo [${campaign}] failed for ${r.email}:`, err)
      Sentry.captureException(err, { tags: { campaign } })
      result.failed++
      result.failures.push({ email: r.email, error: message })
    }

    await sleep(SEND_INTERVAL_MS)
  }

  console.log('send-promo complete:', JSON.stringify({ ...result, failures: result.failures.length }))
  if (result.failed > 0 || result.notReached > 0) {
    await sendAlert(
      `⚠️ Promo "${campaign}": ${result.sent} sent, ${result.failed} failed, ` +
      `${result.notReached} not reached. Re-run the same campaign to retry; ` +
      `sent recipients are skipped.`
    )
  }

  return NextResponse.json(result)
}
