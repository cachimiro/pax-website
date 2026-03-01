import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateCalendarEvent } from '@/lib/crm/calendar'

/**
 * PATCH /api/crm/bookings/reschedule
 * Updates booking time and syncs to Google Calendar if linked.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId, scheduled_at } = await req.json()
  if (!bookingId || !scheduled_at) {
    return NextResponse.json({ error: 'bookingId and scheduled_at required' }, { status: 400 })
  }

  // Update the booking in DB
  const { data: booking, error } = await supabase
    .from('bookings')
    .update({ scheduled_at })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If linked to a Google Calendar event, update it
  if (booking.google_event_id) {
    try {
      await updateCalendarEvent(supabase, booking.google_event_id, {
        startTime: scheduled_at,
        durationMin: booking.duration_min,
      })
    } catch (err) {
      console.error('Calendar reschedule sync error:', err)
      // Don't fail the reschedule if calendar sync fails
    }
  }

  return NextResponse.json(booking)
}
