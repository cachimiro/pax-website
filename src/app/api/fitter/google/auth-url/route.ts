import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFitterAuthUrl } from '@/lib/fitter/google-calendar'

/** GET — generate Google OAuth URL for fitter calendar connection */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    const url = getFitterAuthUrl(sub.id)
    return NextResponse.json({ url })
  } catch (err: unknown) {
    console.error('Fitter Google auth URL error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}
