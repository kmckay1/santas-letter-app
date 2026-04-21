import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPhysicalLetter } from '@/lib/lob'

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron or with the correct secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  // Fetch all unsent letters due today or earlier
  const { data: letters, error } = await supabase
    .from('scheduled_letters')
    .select('*')
    .eq('sent', false)
    .lte('send_after', today)

  if (error) {
    console.error('Error fetching scheduled letters:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!letters || letters.length === 0) {
    console.log('No letters due today')
    return NextResponse.json({ sent: 0 })
  }

  console.log(`Found ${letters.length} letters to send`)

  let sent = 0
  let failed = 0

  for (const letter of letters) {
    try {
      const result = await sendPhysicalLetter(
        letter.shipping,
        letter.child_info,
        {
          content: letter.letter_content,
          childName: letter.child_name,
          createdAt: new Date().toISOString(),
        }
      )

      // Mark as sent
      await supabase
        .from('scheduled_letters')
        .update({
          sent: true,
          sent_at: new Date().toISOString(),
          lob_letter_id: result.id,
        })
        .eq('id', letter.id)

      console.log(`✅ Sent letter for ${letter.child_name}, Lob ID: ${result.id}`)
      sent++
    } catch (err) {
      console.error(`❌ Failed to send letter for ${letter.child_name}:`, err)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, total: letters.length })
}