import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processMeetingTracking } from '@/lib/crm/meeting-tracker'

/**
 * POST /api/cron/meetings
 * Check completed meetings for attendance and trigger post-call actions.
 * Called by Vercel cron every 5 minutes.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  const webhookSecret = req.headers.get('x-webhook-secret')

  const isAuthorized =
    (cronSecret && cronSecret === process.env.CRON_SECRET) ||
    (webhookSecret && webhookSecret === process.env.CRM_WEBHOOK_SECRET)

  if (!isAuthorized) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
  }

  try {
    const supabase = createAdminClient()
    const result = await processMeetingTracking(supabase)

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Meeting tracking cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/cron/meetings
 * Returns count of bookings pending tracking.
 */
export async function GET(req: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()

  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('outcome', 'pending')
    .eq('tracking_status', 'pending')
    .lte('scheduled_at', now)

  return NextResponse.json({ pending_tracking: count ?? 0 })
}
