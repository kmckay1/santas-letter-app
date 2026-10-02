import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import type { ChildInfo } from '@/types'

// Letter generation, with two backstops on what the model writes:
//
//   1. a regex for the private behavior rating (free, runs first), and
//   2. a cheaper model call that lists child-specific details the parent never
//      provided (an invented scene, a pet, "the wind caught your hair").
//
// Both are needed because the prompt already forbids both failures and the
// model still produces them. If either check flags the letter it is written
// again ONCE, with both sets of fixes in the prompt, and the second letter is
// delivered whatever it contains: a parent is never left without a letter.
//
// The invention check fails open. A timeout, an API error, a refusal or an
// unusable reply means the letter is delivered as written. Sentry gets counts
// and reason tags only; letter text and child details never leave this module
// except to the two model calls.

const client = new Anthropic()

const LETTER_MODEL = 'claude-opus-4-5'
const CHECK_MODEL = 'claude-haiku-4-5-20251001'
const CHECK_TIMEOUT_MS = 8000

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Dutch',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
}

// --- Rating leak ------------------------------------------------------------

// The prompt tells the model never to quote the private behavior rating, but a
// prompt is not a guarantee, and a child told they scored "3 out of 10" is the
// failure that matters. These catch the forms seen in practice.
const RATING_LEAK_PATTERNS: RegExp[] = [
  /\d+\s*\/\s*10\b/,
  /\bout\s+of\s+(?:ten|10)\b/i,
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+out\s+of\b/i,
]

// Returns the first matching phrase, or null when the letter is clean.
export function findRatingLeak(text: string): string | null {
  for (const pattern of RATING_LEAK_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[0]
  }
  return null
}

// --- Letter prompt ----------------------------------------------------------

interface Revision {
  ratingLeak: string | null
  inventedDetails: string[]
}

function letterPrompt(child: ChildInfo, language: string, revision?: Revision): string {
  const wishList = child.wishes
    .filter(w => w.trim())
    .map((w, i) => `${i + 1}. ${w}`)
    .join('\n')

  const languageName = LANGUAGE_NAMES[language] || 'English'
  const languageInstruction = language !== 'en'
    ? `\nWRITE THE ENTIRE LETTER IN ${languageName.toUpperCase()}. Every word must be in ${languageName}. Santa speaks all languages fluently.`
    : `\nWrite in American English: American spelling and vocabulary throughout (color, favorite, mom).`

  let revisionNotes = ''
  if (revision) {
    const notes: string[] = []
    if (revision.ratingLeak) {
      notes.push(`- It referred to the behavior rating ("${revision.ratingLeak}"). Never mention the rating in any form.`)
    }
    if (revision.inventedDetails.length > 0) {
      notes.push(
        `- It included details about the child that the parent never provided. Leave out these and anything like them:\n` +
        revision.inventedDetails.map(d => `  * "${d}"`).join('\n')
      )
    }
    revisionNotes = `\n\nREVISION: An earlier draft of this letter had problems. Write a fresh letter that avoids them:\n${notes.join('\n')}`
  }

  return `You are Santa Claus — Father Christmas, Kris Kringle, St. Nicholas. You have been writing personal letters to children for over 1,700 years. You write with the warmth of a beloved grandfather, the authority of someone who genuinely knows this child, and the gentle magic of someone who lives at the North Pole with Mrs. Claus, a workshop full of elves, and eight very opinionated reindeer.

PERSONA & TONE:
- Warmly formal — full sentences, no slang, no exclamation marks every line
- Omniscient but kind — you know what they've done, you frame it with love not surveillance
- Grounded in what the parent shared — build on the specifics they gave rather than vague compliments, and never add specifics of your own
- Gently instructive on bad behavior — encouraging, never threatening, never mention "naughty list"
- Playfully alive — Mrs. Claus, the elves, the reindeer are real characters with personalities
- Age-calibrated: ages 3–5: wonder and simplicity. Ages 6–9: adventure and moral encouragement. Ages 10–12: respect their growing maturity, acknowledge they are changing
- Your voice is that of someone who has seen everything and still finds children endlessly magical
${languageInstruction}

Child's name: ${child.name}
Age: ${child.age}
Behavior rating (1-10, 10 = saintly; private, for tone only): ${child.behaviorRating}/10
What Santa has observed: ${child.behaviorNotes?.trim() || '(nothing specific provided — stay warm and general about the child)'}
Their Christmas wishes:
${wishList}
${child.parentNotes ? `\nPrivate note from a parent (weave in naturally — never reveal the source, treat it as something Santa simply knows): ${child.parentNotes}` : ''}

Write a letter with EXACTLY this structure — no salutation, no sign-off, those are added separately:
- Paragraph 1: Open with what the parent told you about this child's year, told as something Santa has noticed. Use only the specifics provided: do not add a time, place, scene, weather, sensation or anything the child did beyond what was written. If the notes are sparse or empty, open with warmth about the child in general and take the color from North Pole life instead (the workshop, Mrs. Claus, the elves, the reindeer).
- Paragraph 2: Address behavior honestly. Celebrate the good using the specifics provided. If behavior was mixed, address it gently and encouragingly — one kind nudge, never a lecture.
- Paragraph 3: The wishes. Acknowledge each one warmly. Be playful about impractical ones. Create mystery and anticipation without making promises. Do not invent scenes of the child using or enjoying a gift.
- Paragraph 4: A closing that inspires. End with a rhyming couplet that feels earned, not forced.
- P.S.: Something warm and slightly surprising, tied to a detail the parent provided, or if there is none, a small piece of North Pole news. Never a generic reindeer or cookie joke.

- NEVER invent specific physical details about the child's home (room layout, furniture placement, views from windows) — you only know what has been explicitly told to you.
- NEVER invent specific events, moments, or stories about the child that were not explicitly provided. If behavior notes are empty, speak generally about their character, not made-up scenes.
- NEVER invent details about the child's appearance, family, friends, pets or belongings, or new facts about any person the parent named.
- Unless the parent's input shows the child's gender (pronouns or gendered words in the notes or the private note), do not use gendered words for the child: no girl, boy, young man, little lady, and no gendered pronouns or adjectives for the child, in any language. Use the child's name or gender-neutral phrasing; in languages with grammatical gender, choose a construction that does not gender the child.
- NEVER state, quote, or refer to the behavior rating in any form: no numbers, no scores, no scales (not "eight out of ten", not "a solid 8", not "eight times out of ten", nothing numeric). The rating is only for calibrating your tone and is never for the child to see. Convey warmth in proportion to it through word choice alone.
Separate paragraphs with a blank line. Maximum 380 words. Make every sentence earn its place.${revisionNotes}`
}

function letterTextOf(message: Anthropic.Message): string {
  return message.content[0]?.type === 'text' ? message.content[0].text : ''
}

async function writeLetter(child: ChildInfo, language: string, revision?: Revision): Promise<string> {
  const message = await client.messages.create({
    model: LETTER_MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: letterPrompt(child, language, revision) }],
  })
  return letterTextOf(message)
}

// --- Invention check --------------------------------------------------------

export interface InventionFlag {
  quote: string
  reason: string
}

export type CheckFailure = 'timeout' | 'api_error' | 'refusal' | 'max_tokens' | 'parse' | 'schema'

export type InventionCheck =
  | { status: 'clean'; flags: []; ms: number }
  | { status: 'flagged'; flags: InventionFlag[]; ms: number }
  | { status: 'failed'; failure: CheckFailure; ms: number }

const CHECK_SYSTEM = `You check a letter from Santa against the facts a parent supplied about their child.
List every specific detail in the letter about the child or the child's real world
that the parent's input does not support.

FLAG (child-specific details not in the input):
- events, moments or scenes, and anything about how they went ("you finally played
  your third song", "you sat very still afterward")
- times, dates, seasons, weather, places ("a warm morning in July", "at the pool")
- physical sensations, appearance, body or posture ("the wind caught your hair",
  "square your small shoulders")
- people, family members, friends, teachers, pets, and their names or relationships
- the home, rooms, belongings, or things the child made, unless named in the input
  ("the green dragon with gold wings")
- gendered nouns, pronouns or adjectives referring to the child, in any language
  (girl/boy, meisje/jongen, haar/zijn), unless the parent's input shows the child's
  gender. Only words that refer to the child: "haar" meaning hair, and pronouns for
  Mrs. Claus, elves, reindeer or a person the parent named, are not flags
- invented scenes or details involving a wish item ("zooming your scooter around the
  neighborhood"): the wish itself is supported, an invented scene around it is not
- invented details about any person the parent named ("Grandpa's fishing trips"):
  the named person is supported, new facts about them are not

DO NOT FLAG:
- North Pole whimsy: Santa, Mrs. Claus, elves, reindeer, the Tooth Fairy, the
  workshop, North Pole life, and anything those characters do or say. For example:
  an elf named Jingles who runs the toy workshop and tests the scooters; Mrs. Claus
  baking gingerbread, whistling, or remembering learning to ride a bike herself;
  the reindeer stamping with impatience or practicing their landings; elves pausing
  to cheer, or sewing dolls' dresses
- general lines about a wish item that do not claim the child did anything ("there
  is nothing like the wind in your hair on a scooter", "glow-in-the-dark stars turn
  any ceiling into a night sky")
- feelings, encouragement, values and general reflections ("that took courage")
- restating or warmly paraphrasing what the parent provided
- the child's wishes, and playful remarks about them
- general statements that fit any child of that age

Paraphrase is fine; new facts are not. When unsure whether the input supports a
detail, flag it. The letter may be in another language: quote it in that language.
Quote each flagged phrase exactly as it appears in the letter, as short as possible,
and give a brief reason. If nothing is unsupported, return an empty list.`

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    unsupported: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['quote', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['unsupported'],
  additionalProperties: false,
}

function checkInput(child: ChildInfo, language: string, letter: string): string {
  const none = '(none)'
  const wishes = child.wishes.filter(w => w.trim())
  return [
    'PARENT INPUT',
    `Child's name: ${child.name}`,
    `Age: ${child.age}`,
    `What the parent said about the child's year: ${child.behaviorNotes?.trim() || none}`,
    `Wishes: ${wishes.length ? wishes.join('; ') : none}`,
    `Private note from the parent: ${child.parentNotes?.trim() || none}`,
    `Letter language: ${LANGUAGE_NAMES[language] || 'English'}`,
    '',
    'LETTER',
    letter,
  ].join('\n')
}

// Test seam only: lets scripts/test-invention-check.ts substitute the model call
// to exercise the fail-open paths. Production callers never pass it.
export type CheckCaller = (
  body: Anthropic.MessageCreateParamsNonStreaming,
  options: { timeout: number; maxRetries: number },
) => Promise<Anthropic.Message>

const defaultCaller: CheckCaller = (body, options) => client.messages.create(body, options)

function isFlagList(value: unknown): value is { unsupported: InventionFlag[] } {
  if (!value || typeof value !== 'object') return false
  const list = (value as { unsupported?: unknown }).unsupported
  return Array.isArray(list) && list.every(item =>
    item && typeof item === 'object' &&
    typeof (item as InventionFlag).quote === 'string' &&
    typeof (item as InventionFlag).reason === 'string'
  )
}

export async function checkInventedDetails(
  child: ChildInfo,
  language: string,
  letter: string,
  options: { timeoutMs?: number; caller?: CheckCaller } = {},
): Promise<InventionCheck> {
  const started = Date.now()
  const elapsed = () => Date.now() - started
  const fail = (failure: CheckFailure): InventionCheck => ({ status: 'failed', failure, ms: elapsed() })

  let message: Anthropic.Message
  try {
    message = await (options.caller ?? defaultCaller)(
      {
        model: CHECK_MODEL,
        max_tokens: 1024,
        system: CHECK_SYSTEM,
        messages: [{ role: 'user', content: checkInput(child, language, letter) }],
        output_config: { format: { type: 'json_schema', schema: CHECK_SCHEMA } },
      },
      { timeout: options.timeoutMs ?? CHECK_TIMEOUT_MS, maxRetries: 0 },
    )
  } catch (err) {
    return fail(err instanceof Anthropic.APIConnectionTimeoutError ? 'timeout' : 'api_error')
  }

  if (message.stop_reason === 'refusal') return fail('refusal')
  if (message.stop_reason === 'max_tokens') return fail('max_tokens')

  let parsed: unknown
  try {
    parsed = JSON.parse(letterTextOf(message))
  } catch {
    return fail('parse')
  }
  if (!isFlagList(parsed)) return fail('schema')

  const flags = parsed.unsupported.filter(f => f.quote.trim())
  return flags.length
    ? { status: 'flagged', flags, ms: elapsed() }
    : { status: 'clean', flags: [], ms: elapsed() }
}

// --- Generate, check, regenerate once ---------------------------------------

export interface GenerationResult {
  letterText: string
  regenerated: boolean
  // What the checks found on the first letter.
  firstLetter: string
  firstRatingLeak: string | null
  firstCheck: InventionCheck
  // The regex rerun on the delivered letter (null when it was not regenerated).
  finalRatingLeak: string | null
  timings: { firstLetterMs: number; checkMs: number; secondLetterMs: number | null; totalMs: number }
}

export async function generateLetter(
  child: ChildInfo,
  language: string,
  options: { checkTimeoutMs?: number; checkCaller?: CheckCaller } = {},
): Promise<GenerationResult> {
  const started = Date.now()

  const firstLetter = await writeLetter(child, language)
  const firstLetterMs = Date.now() - started

  const firstRatingLeak = findRatingLeak(firstLetter)
  const firstCheck = await checkInventedDetails(child, language, firstLetter, {
    timeoutMs: options.checkTimeoutMs,
    caller: options.checkCaller,
  })

  if (firstCheck.status === 'failed') {
    console.warn(`Invention check failed open (${firstCheck.failure}); delivering the letter as written`)
    Sentry.captureMessage('Invention check failed open', {
      level: 'warning',
      tags: { invention_check_failure: firstCheck.failure },
    })
  }

  const inventedDetails = firstCheck.status === 'flagged' ? firstCheck.flags.map(f => f.quote) : []
  const timings = { firstLetterMs, checkMs: firstCheck.ms, secondLetterMs: null as number | null, totalMs: 0 }

  if (!firstRatingLeak && inventedDetails.length === 0) {
    timings.totalMs = Date.now() - started
    return { letterText: firstLetter, regenerated: false, firstLetter, firstRatingLeak, firstCheck, finalRatingLeak: null, timings }
  }

  // Counts and the leaked phrase only (the phrase is a number, not a detail
  // about the child). The flagged quotes stay out of logs and Sentry.
  console.warn(
    `Regenerating letter once: rating leak ${firstRatingLeak ? `"${firstRatingLeak}"` : 'none'}, ` +
    `${inventedDetails.length} unsupported detail(s)`
  )
  Sentry.captureMessage('Letter regenerated', {
    level: 'warning',
    tags: {
      regenerate_rating_leak: firstRatingLeak ? 'yes' : 'no',
      regenerate_invention_flags: String(inventedDetails.length),
      ...(firstRatingLeak && { rating_leak: firstRatingLeak }),
    },
  })

  const secondStarted = Date.now()
  const secondLetter = await writeLetter(child, language, { ratingLeak: firstRatingLeak, inventedDetails })
  timings.secondLetterMs = Date.now() - secondStarted

  // The second letter is delivered regardless. Only the free regex runs on it,
  // for reporting.
  const finalRatingLeak = findRatingLeak(secondLetter)
  if (finalRatingLeak) {
    console.error(`Regenerated letter still quotes the behavior rating ("${finalRatingLeak}"); returning it anyway`)
    Sentry.captureMessage('Letter still quotes the behavior rating after one regeneration', {
      level: 'error',
      tags: { rating_leak: finalRatingLeak },
    })
  }

  timings.totalMs = Date.now() - started
  return { letterText: secondLetter, regenerated: true, firstLetter, firstRatingLeak, firstCheck, finalRatingLeak, timings }
}
