import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/crm/calendar'

/**
 * POST /api/crm/calendar/events — Create a calendar event
 * PATCH /api/crm/calendar/events — Update a calendar event
 * DELETE /api/crm/calendar/events — Delete a calendar event
 */

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { summary, description, startTime, durationMin, attendeeEmail, location } = body

  if (!summary || !startTime || !durationMin) {
    return NextResponse.json({ error: 'summary, startTime, durationMin required' }, { status: 400 })
  }

  try {
    const result = await createCalendarEvent(supabase, {
      summary,
      description,
      startTime,
      durationMin,
      attendeeEmail,
      location,
    })

    if (!result) {
      return NextResponse.json({ error: 'Calendar not connected or inactive' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Calendar event create error:', err)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { eventId, ...updates } = body

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  try {
    const ok = await updateCalendarEvent(supabase, eventId, updates)
    if (!ok) {
      return NextResponse.json({ error: 'Calendar not connected or inactive' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Calendar event update error:', err)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  try {
    const ok = await deleteCalendarEvent(supabase, eventId)
    if (!ok) {
      return NextResponse.json({ error: 'Calendar not connected or inactive' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Calendar event delete error:', err)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
