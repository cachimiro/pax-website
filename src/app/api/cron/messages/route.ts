import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processQueuedMessages } from '@/lib/crm/messaging/send'

/**
 * POST /api/cron/messages
 * Process queued messages whose scheduled_for has passed.
 * Called by:
 *   - Vercel cron (every 2 minutes)
 *   - Manual "Process Queue" button in Settings
 *   - Webhook secret auth for external cron
 *
 * Auth: either CRON_SECRET header or CRM_WEBHOOK_SECRET or admin session.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  const webhookSecret = req.headers.get('x-webhook-secret')

  const isAuthorized =
    (cronSecret && cronSecret === process.env.CRON_SECRET) ||
    (webhookSecret && webhookSecret === process.env.CRM_WEBHOOK_SECRET)

  // Also allow admin session
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
    const processed = await processQueuedMessages(supabase)

    return NextResponse.json({ processed, timestamp: new Date().toISOString() })
  } catch (err: any) {
    console.error('Cron message processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/cron/messages
 * Returns queue depth (pending messages count).
 */
export async function GET(req: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()

  const [readyRes, scheduledRes] = await Promise.all([
    supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`),
    supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'queued')
      .gt('scheduled_for', now),
  ])

  return NextResponse.json({
    ready_to_send: readyRes.count ?? 0,
    scheduled: scheduledRes.count ?? 0,
    total_queued: (readyRes.count ?? 0) + (scheduledRes.count ?? 0),
  })
}
