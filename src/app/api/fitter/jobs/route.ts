import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get subcontractor record
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    // Fetch jobs for this fitter, most recent first
    const { data: jobs, error } = await admin
      .from('fitting_jobs')
      .select('*')
      .eq('subcontractor_id', sub.id)
      .not('status', 'eq', 'cancelled')
      .order('scheduled_date', { ascending: true, nullsFirst: false })

    if (error) throw error

    return NextResponse.json({ jobs: jobs || [] })
  } catch (err: unknown) {
    console.error('Fitter jobs fetch error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
