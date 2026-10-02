// Exercises lib/letter-generation.ts with real model calls: six input shapes, three
// runs each, plus the invention check's fail-open paths. Spends API credit (about
// $1 for a full run). Writes nothing to the database and sends no email.
//
//   set -a; source .env.local; set +a; npx tsx scripts/test-invention-check.ts [out.json]
//
// Unlike production, it also runs the checker on the regenerated letter, so the
// output shows whether regeneration removed the flagged details.

import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import type { ChildInfo } from '@/types'
import {
  generateLetter,
  checkInventedDetails,
  findRatingLeak,
  type CheckCaller,
  type InventionCheck,
} from '@/lib/letter-generation'

const RUNS = 3

type Case = { name: string; language: string; child: ChildInfo; namedPeople?: string[] }

function child(c: Partial<ChildInfo> & Pick<ChildInfo, 'name' | 'age'>): ChildInfo {
  return { behaviorRating: 8, behaviorNotes: '', wishes: [], parentNotes: '', recipientEmail: 'delivered@resend.dev', ...c }
}

const CASES: Case[] = [
  { name: '1 sparse notes', language: 'en', child: child({ name: 'Mia', age: '6', wishes: ['a scooter'] }) },
  {
    name: '2 detailed notes', language: 'en',
    child: child({
      name: 'Oliver', age: '7', behaviorRating: 9,
      behaviorNotes: 'Started piano lessons in spring and practices every day. Lost two front teeth. Nervous about his recital in December.',
      wishes: ['robot kit', 'skateboard', 'space books'],
    }),
  },
  {
    name: '3 siblings', language: 'en', namedPeople: ['Leo'],
    child: child({
      name: 'Ava', age: '8', behaviorRating: 7,
      behaviorNotes: 'Has been kinder to her little brother Leo this year, though they still squabble over the tablet.',
      wishes: ['art set'],
    }),
  },
  {
    name: '4 hard year', language: 'en', namedPeople: ['Grandpa', 'Grandma'],
    child: child({
      name: 'Sam', age: '9',
      behaviorNotes: 'Grandpa passed away in the summer; Sam has been brave and helped Grandma.',
      parentNotes: 'Please mention Grandpa gently.',
      wishes: ['fishing rod'],
    }),
  },
  { name: '5 wishes only', language: 'en', child: child({ name: 'Noah', age: '5', wishes: ['dinosaur toy', 'glow-in-the-dark stars', 'a puppy'] }) },
  {
    name: '6 non-English (nl)', language: 'nl',
    child: child({ name: 'Lotte', age: '6', behaviorRating: 9, behaviorNotes: 'Heeft dit jaar leren fietsen.', wishes: ['een pop'] }),
  },
  { name: '7 no gender info (Riley)', language: 'en', child: child({ name: 'Riley', age: '6', wishes: ['a bike'] }) },
]

// Cases whose input does not show the child's gender, so any gendered word for the
// child in the delivered letter is a miss. Matches are surfaced for human review:
// the same words can refer to Mrs. Claus, an elf, or (Dutch "haar") hair.
const UNGENDERED = new Set(['1 sparse notes', '5 wishes only', '6 non-English (nl)', '7 no gender info (Riley)'])
const GENDERED: Record<string, RegExp> = {
  en: /\b(girl|boy|young (?:man|lady)|little (?:man|lady)|son|daughter|he|him|his|she|her|hers|himself|herself)\b/gi,
  nl: /\b(meisje|jongen|meid|jongetje|zoon|dochter|hij|hem|zijn|zij|ze|haar)\b/gi,
}

function genderedSentences(text: string, language: string): string[] {
  const re = GENDERED[language]
  if (!re) return []
  return text.split(/(?<=[.!?])\s+|\n+/).filter(sentence => { re.lastIndex = 0; return re.test(sentence) })
}

// British spellings and words a US parent would notice. English letters only.
const BRITISH = /\b(colour\w*|favourite\w*|behaviour\w*|neighbour\w*|honour\w*|realis\w+|organis\w+|centre|theatre|travelled|travelling|jewellery|cosy|programme|mum|mummy|learnt|grey)\b/gi

function britishWords(text: string): string[] {
  return Array.from(new Set((text.match(BRITISH) ?? []).map(w => w.toLowerCase())))
}

function flagsOf(check: InventionCheck | null) {
  if (!check) return null
  return check.status === 'failed' ? { failed: check.failure } : check.flags
}

async function runOnce(c: Case, run: number) {
  const result = await generateLetter(c.child, c.language)
  const secondCheck = result.regenerated ? await checkInventedDetails(c.child, c.language, result.letterText) : null
  return {
    case: c.name, run,
    regenerated: result.regenerated,
    letter1: result.firstLetter,
    letter1RatingLeak: result.firstRatingLeak,
    letter1Check: result.firstCheck.status,
    letter1Flags: flagsOf(result.firstCheck),
    letter2: result.regenerated ? result.letterText : null,
    letter2RatingLeak: result.regenerated ? findRatingLeak(result.letterText) : null,
    letter2Check: secondCheck?.status ?? null,
    letter2Flags: flagsOf(secondCheck),
    deliveredBritish: c.language === 'en' ? britishWords(result.letterText) : null,
    // Sentences with a gendered word, for cases where the input shows no gender.
    deliveredGenderedSentences: UNGENDERED.has(c.name) ? genderedSentences(result.letterText, c.language) : null,
    timings: { ...result.timings, letter2CheckMs: secondCheck?.ms ?? null },
  }
}

// --- Fail-open paths ---------------------------------------------------------

function fakeMessage(text: string, stop_reason: Anthropic.Message['stop_reason']): Anthropic.Message {
  return {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'test', stop_reason, stop_sequence: null,
    content: [{ type: 'text', text, citations: null }],
    usage: { input_tokens: 0, output_tokens: 0 },
  } as unknown as Anthropic.Message
}

async function failOpenTests() {
  const c = CASES[1]
  const sample = 'Dear Oliver, the wind caught your hair at the pool.'
  const callers: Record<string, CheckCaller> = {
    api_error: async () => { throw new Error('simulated API failure') },
    refusal: async () => fakeMessage('', 'refusal'),
    max_tokens: async () => fakeMessage('{"unsupported": [', 'max_tokens'),
    parse: async () => fakeMessage('not json at all', 'end_turn'),
    schema: async () => fakeMessage('{"problems": []}', 'end_turn'),
  }
  const unit: Record<string, string> = {}
  for (const [expected, caller] of Object.entries(callers)) {
    const r = await checkInventedDetails(c.child, c.language, sample, { caller })
    unit[expected] = r.status === 'failed' ? r.failure : `UNEXPECTED ${r.status}`
  }
  // A real call with a 1 ms limit.
  const t = await checkInventedDetails(c.child, c.language, sample, { timeoutMs: 1 })
  unit.timeout = t.status === 'failed' ? t.failure : `UNEXPECTED ${t.status}`

  // End to end: a failing checker must deliver the first letter, not regenerate.
  const e2e = await generateLetter(c.child, c.language, { checkCaller: callers.api_error })
  return {
    unit,
    endToEnd: {
      checkStatus: e2e.firstCheck.status,
      regenerated: e2e.regenerated,
      deliveredIsFirstLetter: e2e.letterText === e2e.firstLetter && e2e.letterText.length > 0,
      ratingLeak: e2e.firstRatingLeak,
      totalMs: e2e.timings.totalMs,
    },
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set (source .env.local first)')
  const out = process.argv[2] ?? join(tmpdir(), `invention-check-${Date.now()}.json`)

  const runs = []
  for (const c of CASES) {
    // The three runs of a case go in parallel; cases run one after another.
    const batch = await Promise.all(Array.from({ length: RUNS }, (_, i) => runOnce(c, i + 1)))
    for (const r of batch) {
      runs.push(r)
      const n1 = Array.isArray(r.letter1Flags) ? r.letter1Flags.length : JSON.stringify(r.letter1Flags)
      const n2 = r.letter2Flags === null ? '-' : Array.isArray(r.letter2Flags) ? r.letter2Flags.length : JSON.stringify(r.letter2Flags)
      console.log(
        `${r.case} #${r.run}: regenerated=${r.regenerated} flags1=${n1} flags2=${n2} ` +
        `leak1=${r.letter1RatingLeak ?? '-'} leak2=${r.letter2RatingLeak ?? '-'} british=${r.deliveredBritish?.join(',') || '-'} ` +
        `gendered=${r.deliveredGenderedSentences === null ? 'n/a' : r.deliveredGenderedSentences.length} ` +
        `ms=${r.timings.firstLetterMs}/${r.timings.checkMs}/${r.timings.secondLetterMs ?? '-'} total=${r.timings.totalMs}`
      )
    }
  }

  const failOpen = await failOpenTests()
  console.log('fail-open:', JSON.stringify(failOpen))

  writeFileSync(out, JSON.stringify({ cases: CASES, runs, failOpen }, null, 2))
  console.log(`full output: ${out}`)
}

main().catch(err => { console.error(err); process.exit(1) })
