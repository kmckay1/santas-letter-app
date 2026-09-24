// Run with: npx tsx scripts/purge-old-letters.ts [--confirm]. Dry-run by default. Do not commit output.
//
// One-off cleanup of the lob-letters bucket, which holds letters carrying a
// child's name and home address. Deletes:
//   - every .html file: Lob-era letters, no longer read by anything
//   - every .pdf older than 24 hours: each send uploads a fresh PDF and hands
//     Stannp a one-hour signed URL, so anything older is dead, whether the send
//     succeeded, failed, or was a test
// Anything else, including a file with no created_at, is kept.
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment, e.g.
//   set -a; source .env.local; set +a; npx tsx scripts/purge-old-letters.ts

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'lob-letters'
const PAGE_SIZE = 1000
const DELETE_BATCH_SIZE = 100
const PDF_MAX_AGE_MS = 24 * 60 * 60 * 1000

interface StoredFile {
  name: string
  createdAt: string | null
}

function shouldDelete(file: StoredFile, now: number): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.html')) return true
  if (name.endsWith('.pdf') && file.createdAt) {
    return now - new Date(file.createdAt).getTime() > PDF_MAX_AGE_MS
  }
  return false
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    process.exit(1)
  }

  const confirm = process.argv.includes('--confirm')
  const supabase = createClient(url, key)
  const storage = supabase.storage.from(BUCKET)

  // One list() call returns at most PAGE_SIZE entries, so keep paging until a
  // short page comes back. A single call would silently miss everything past
  // the first thousand.
  const files: StoredFile[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await storage.list('', {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      console.error(`Listing ${BUCKET} failed at offset ${offset}: ${error.message}`)
      process.exit(1)
    }
    for (const entry of data ?? []) {
      // Folder placeholders come back with a null id. Letters live at the root.
      if (entry.id === null) continue
      files.push({ name: entry.name, createdAt: entry.created_at ?? null })
    }
    if (!data || data.length < PAGE_SIZE) break
  }

  const now = Date.now()
  const toDelete = files.filter(f => shouldDelete(f, now)).map(f => f.name)
  const kept = files.length - toDelete.length

  if (!confirm) {
    console.log(`DRY RUN: ${BUCKET} holds ${files.length} files`)
    for (const name of toDelete) console.log(`DRY RUN: would delete ${name}`)
    console.log(`DRY RUN: ${toDelete.length} would be deleted, ${kept} kept. Re-run with --confirm to delete.`)
    return
  }

  let deleted = 0
  let failed = 0
  for (let i = 0; i < toDelete.length; i += DELETE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + DELETE_BATCH_SIZE)
    const { data, error } = await storage.remove(batch)
    if (error) {
      failed += batch.length
      console.error(`Batch starting at ${i} failed: ${error.message}`)
      continue
    }
    deleted += data?.length ?? 0
  }

  console.log(`Deleted ${deleted} files, kept ${kept}${failed ? `, ${failed} failed to delete` : ''}.`)
  if (failed) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
