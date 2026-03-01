import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Any authenticated user can check status (to show "from" address in SendConfirmation)
  const { data: config } = await supabase
    .from('google_config')
    .select('id, email, email_active, calendar_active, connected_by, connected_at, needs_reauth')
    .limit(1)
    .single()

  if (!config) {
    return NextResponse.json({ connected: false })
  }

  // Get connected-by name
  const { data: connectedByProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', config.connected_by)
    .single()

  // Get email stats (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [sentRes, openRes, clickRes] = await Promise.all([
    supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'email')
      .eq('status', 'sent')
      .gte('sent_at', weekAgo),
    supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'open')
      .gte('created_at', weekAgo),
    supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .gte('created_at', weekAgo),
  ])

  // Calendar stats: upcoming bookings synced to Google Calendar
  const { count: syncedUpcoming } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .not('google_event_id', 'is', null)
    .gte('scheduled_at', new Date().toISOString())

  return NextResponse.json({
    connected: true,
    email: config.email,
    email_active: config.email_active,
    calendar_active: config.calendar_active,
    needs_reauth: config.needs_reauth,
    connected_at: config.connected_at,
    connected_by_name: connectedByProfile?.full_name ?? 'Unknown',
    stats: {
      sent_this_week: sentRes.count ?? 0,
      opens_this_week: openRes.count ?? 0,
      clicks_this_week: clickRes.count ?? 0,
    },
    calendar_stats: {
      synced_upcoming: syncedUpcoming ?? 0,
    },
  })
}
