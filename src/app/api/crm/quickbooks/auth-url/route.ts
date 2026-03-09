import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/crm/quickbooks'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.QB_CLIENT_ID) {
    return NextResponse.json(
      { error: 'QB_CLIENT_ID not configured. Add credentials to environment variables.' },
      { status: 503 }
    )
  }

  // State encodes the user ID for CSRF protection
  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64')
  const url = getAuthUrl(state)

  return NextResponse.json({ url })
}
