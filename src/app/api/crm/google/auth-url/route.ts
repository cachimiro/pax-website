import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/crm/google'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // state=onboarding → per-user calendar connect (any authenticated user)
  // no state        → shared admin google_config (admin only)
  const state = req.nextUrl.searchParams.get('state') ?? undefined

  if (!state) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
  }

  const url = getAuthUrl(state ?? user.id)
  return NextResponse.json({ url })
}
