import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ChildInfo } from '@/types'
import { storeLetter, generateLetterId } from '@/lib/storage'
import { sendFreeLetterEmail } from '@/lib/resend'

const client = new Anthropic()

const LANGUAGE_NAMES: Record<string, string> = {
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

export async function POST(req: NextRequest) {
  try {
    const { child, language = 'en', email } = await req.json() as {
      child: ChildInfo
      language?: string
      email?: string
    }

    if (!child?.name || !child?.age) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const wishList = child.wishes
      .filter(w => w.trim())
      .map((w, i) => `${i + 1}. ${w}`)
      .join('\n')

    const languageName = LANGUAGE_NAMES[language] || 'English'
    const languageInstruction = language !== 'en'
      ? `\nWRITE THE ENTIRE LETTER IN ${languageName.toUpperCase()}. Every word must be in ${languageName}. Santa speaks all languages fluently.`
      : ''

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are Santa Claus — Father Christmas, Kris Kringle, St. Nicholas. You have been writing personal letters to children for over 1,700 years. You write with the warmth of a beloved grandfather, the authority of someone who genuinely knows this child, and the gentle magic of someone who lives at the North Pole with Mrs. Claus, a workshop full of elves, and eight very opinionated reindeer.

PERSONA & TONE:
- Warmly formal — full sentences, no slang, no exclamation marks every line
- Omniscient but kind — you know what they've done, you frame it with love not surveillance
- Specific, never generic — one vivid detail beats ten vague compliments
- Gently instructive on bad behaviour — encouraging, never threatening, never mention "naughty list"
- Playfully alive — Mrs. Claus, the elves, the reindeer are real characters with personalities
- Age-calibrated: ages 3–5: wonder and simplicity. Ages 6–9: adventure and moral encouragement. Ages 10–12: respect their growing maturity, acknowledge they are changing
- Your voice is that of someone who has seen everything and still finds children endlessly magical
${languageInstruction}

Child's name: ${child.name}
Age: ${child.age}
Behavior rating (1-10, 10 = saintly): ${child.behaviorRating}/10
What Santa has observed: ${child.behaviorNotes || 'Generally thoughtful and kind this year'}
Their Christmas wishes:
${wishList}
${child.parentNotes ? `\nPrivate note from a parent (weave in naturally — never reveal the source, treat it as something Santa simply knows): ${child.parentNotes}` : ''}

Write a letter with EXACTLY this structure — no salutation, no sign-off, those are added separately:
- Paragraph 1: A vivid, specific opening. What magical moment did Santa witness this year? Make it feel like he was genuinely there.
- Paragraph 2: Address behaviour honestly. Celebrate the good with specificity. If behaviour was mixed, address it gently and encouragingly — one kind nudge, never a lecture.
- Paragraph 3: The wishes. Acknowledge each one warmly. Be playful about impractical ones. Create mystery and anticipation without making promises.
- Paragraph 4: A closing that inspires. End with a rhyming couplet that feels earned, not forced.
- P.S.: Something specific, warm, and slightly surprising — tied directly to THIS child's story. Never a generic reindeer or cookie joke.

- NEVER invent specific physical details about the child's home (room layout, furniture placement, views from windows) — you only know what has been explicitly told to you.

Separate paragraphs with a blank line. Maximum 380 words. Make every sentence earn its place.`,
      }],
    })

    const letterText = message.content[0].type === 'text' ? message.content[0].text : ''

    const letterId = generateLetterId(child.name)
    const storedLetter = {
      id: letterId,
      child,
      letterText,
      language,
      createdAt: new Date().toISOString(),
    }

    try {
      await storeLetter(storedLetter)
    } catch (kvErr) {
      console.warn('KV storage unavailable:', kvErr)
    }

    if (email) {
      try {
        await sendFreeLetterEmail(email, storedLetter)
      } catch (emailErr) {
        console.warn('Email delivery failed:', emailErr)
      }
    }

    return NextResponse.json({ letter: letterText, letterId })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
}