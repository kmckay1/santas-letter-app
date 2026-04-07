import { ChildInfo } from '@/types'

export interface StoredLetter {
  id: string
  child: ChildInfo
  letterText: string
  language: string
  createdAt: string
  tier?: string
  fulfilled?: boolean
}

// Vercel KV wrapper — install with: npm install @vercel/kv
// In Vercel dashboard: Storage → Create KV → Connect to project
// Env vars KV_REST_API_URL and KV_REST_API_TOKEN are added automatically

async function getKV() {
  const { kv } = await import('@vercel/kv')
  return kv
}

export async function storeLetter(letter: StoredLetter): Promise<void> {
  const kv = await getKV()
  // Store for 90 days
  await kv.set(`letter:${letter.id}`, JSON.stringify(letter), { ex: 60 * 60 * 24 * 90 })
}

export async function getLetter(id: string): Promise<StoredLetter | null> {
  const kv = await getKV()
  const raw = await kv.get<string>(`letter:${id}`)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function markLetterFulfilled(id: string, tier: string): Promise<void> {
  const kv = await getKV()
  const letter = await getLetter(id)
  if (!letter) return
  letter.fulfilled = true
  letter.tier = tier
  await kv.set(`letter:${id}`, JSON.stringify(letter), { ex: 60 * 60 * 24 * 90 })
}

export function generateLetterId(childName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const slug = childName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)
  return `${slug}-${timestamp}-${random}`
}