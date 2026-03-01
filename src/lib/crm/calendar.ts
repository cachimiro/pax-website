import type { SupabaseClient } from '@supabase/supabase-js'
import { loadGoogleConfig, getCalendarClient, type GoogleConfig } from './google'
import type { calendar_v3 } from 'googleapis'

export interface CalendarEventInput {
  summary: string
  description?: string
  startTime: string // ISO 8601
  durationMin: number
  attendeeEmail?: string
  location?: string
}

export interface CalendarEventResult {
  eventId: string
  htmlLink: string
  meetLink?: string
}

/**
 * Create a Google Calendar event and return its ID + link.
 * Sends an invite to the attendee if provided.
 */
export async function createCalendarEvent(
  supabase: SupabaseClient,
  input: CalendarEventInput & { addMeetLink?: boolean }
): Promise<CalendarEventResult | null> {
  const config = await loadGoogleConfig(supabase)
  if (!config || !config.calendar_active) return null

  const calendar = await getCalendarClient(supabase, config)
  const endTime = new Date(new Date(input.startTime).getTime() + input.durationMin * 60 * 1000)

  const event: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description,
    start: {
      dateTime: input.startTime,
      timeZone: 'Europe/London',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Europe/London',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 },
      ],
    },
  }

  if (input.attendeeEmail) {
    event.attendees = [{ email: input.attendeeEmail }]
  }

  if (input.location) {
    event.location = input.location
  }

  // Add Google Meet video conference
  if (input.addMeetLink !== false) {
    event.conferenceData = {
      createRequest: {
        requestId: `paxbespoke-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: input.attendeeEmail ? 'all' : 'none',
    conferenceDataVersion: input.addMeetLink !== false ? 1 : 0,
  })

  const meetLink = res.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video'
  )?.uri

  return {
    eventId: res.data.id!,
    htmlLink: res.data.htmlLink!,
    meetLink: meetLink ?? undefined,
  }
}

/**
 * Update an existing Google Calendar event.
 */
export async function updateCalendarEvent(
  supabase: SupabaseClient,
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<boolean> {
  const config = await loadGoogleConfig(supabase)
  if (!config || !config.calendar_active) return false

  const calendar = await getCalendarClient(supabase, config)

  const patch: calendar_v3.Schema$Event = {}

  if (input.summary) patch.summary = input.summary
  if (input.description) patch.description = input.description
  if (input.location) patch.location = input.location

  if (input.startTime) {
    patch.start = { dateTime: input.startTime, timeZone: 'Europe/London' }
    const dur = input.durationMin ?? 30
    const endTime = new Date(new Date(input.startTime).getTime() + dur * 60 * 1000)
    patch.end = { dateTime: endTime.toISOString(), timeZone: 'Europe/London' }
  }

  if (input.attendeeEmail) {
    patch.attendees = [{ email: input.attendeeEmail }]
  }

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: patch,
    sendUpdates: 'all',
  })

  return true
}

/**
 * Delete a Google Calendar event.
 */
export async function deleteCalendarEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const config = await loadGoogleConfig(supabase)
  if (!config || !config.calendar_active) return false

  const calendar = await getCalendarClient(supabase, config)

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  })

  return true
}

/**
 * Query free/busy for the connected calendar.
 * Returns busy intervals within the given range.
 */
export async function queryFreeBusy(
  supabase: SupabaseClient,
  timeMin: string,
  timeMax: string
): Promise<{ start: string; end: string }[]> {
  const config = await loadGoogleConfig(supabase)
  if (!config || !config.calendar_active) return []

  const calendar = await getCalendarClient(supabase, config)

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: 'Europe/London',
      items: [{ id: 'primary' }],
    },
  })

  const busy = res.data.calendars?.primary?.busy ?? []
  return busy.map((b) => ({
    start: b.start!,
    end: b.end!,
  }))
}

/**
 * Booking type labels for calendar event summaries.
 */
const BOOKING_LABELS: Record<string, string> = {
  call1: 'Discovery Call',
  call2: 'Design Call',
  onboarding: 'Onboarding Session',
}

/**
 * Create a calendar event for a booking and store the event ID.
 * Called after a booking is inserted.
 */
export async function syncBookingToCalendar(
  supabase: SupabaseClient,
  booking: {
    id: string
    type: string
    scheduled_at: string
    duration_min: number
    opportunity_id: string
  },
  leadName: string,
  leadEmail?: string
): Promise<CalendarEventResult | null> {
  const label = BOOKING_LABELS[booking.type] ?? booking.type
  const summary = `${label} — ${leadName}`

  // Add Meet link for call types (not onboarding which is in-person)
  const isVideoCall = booking.type === 'call1' || booking.type === 'call2'

  const result = await createCalendarEvent(supabase, {
    summary,
    description: `PaxBespoke ${label} with ${leadName}.\nOpportunity: ${booking.opportunity_id}`,
    startTime: booking.scheduled_at,
    durationMin: booking.duration_min,
    attendeeEmail: leadEmail,
    addMeetLink: isVideoCall,
  })

  if (result) {
    const updateData: Record<string, string> = { google_event_id: result.eventId }
    if (result.meetLink) {
      updateData.meet_link = result.meetLink
    }
    await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', booking.id)
  }

  return result
}
