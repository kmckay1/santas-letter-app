import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { rating, name, childName, review } = await req.json()

    if (!rating || !name || !childName || !review) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('reviews').insert({
      rating,
      name,
      child_name: childName,
      review,
      approved: false,
    })

    if (error) {
      console.error('Review insert error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Review API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}