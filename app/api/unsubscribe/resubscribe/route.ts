import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken, markResubscribed } from '@/lib/unsubscribe'

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json()

    if (!email || !token || typeof email !== 'string' || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const lowered = email.toLowerCase().trim()

    if (!verifyUnsubscribeToken(lowered, token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    await markResubscribed(lowered)
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Resubscribe error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}