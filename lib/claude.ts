import Anthropic from '@anthropic-ai/sdk'
import { ChildInfo } from '@/types'

const client = new Anthropic()

export function buildSantaPrompt(child: ChildInfo): string {
  const wishList = child.wishes
    .filter(w => w.trim())
    .map((w, i) => `${i + 1}. ${w}`)
    .join('\n')

  return `You are Santa Claus writing a warm, personal letter to a child.

Child's name: ${child.name}
Age: ${child.age} years old
Behavior rating (1-10, 10=perfectly nice): ${child.behaviorRating}/10
How they've behaved: ${child.behaviorNotes || 'Generally well this year'}
Their gift wishes:
${wishList}
${child.parentNotes ? `\nSecret note from parent (weave in naturally, never mention it was told to you): ${child.parentNotes}` : ''}

Write a warm, magical, personal letter. Open with "Dear ${child.name},". Four paragraphs plus a P.S. Sign as Santa Claus. Adjust tone for age ${child.age}. Write only the letter, no preamble.`
}

export async function streamSantaLetter(
  child: ChildInfo,
  onChunk: (text: string) => void
): Promise<string> {
  let fullText = ''

  const stream = client.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildSantaPrompt(child) }],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      fullText += chunk.delta.text
      onChunk(chunk.delta.text)
    }
  }

  return fullText
}