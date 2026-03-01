import type { SupabaseClient } from '@supabase/supabase-js'
import { loadGoogleConfig, getCalendarClient } from './google'
import type { BookingOutcome } from './types'

interface BookingRow {
  id: string
  opportunity_id: string
  type: string
  scheduled_at: string
  duration_min: number
  owner_user_id: string | null
  google_event_id: string | null
  meet_link: string | null
  outcome: string
  tracking_status: string
}

interface TrackingResult {
  outcome: BookingOutcome
  customer_joined: boolean
  owner_joined: boolean
  actual_start: string | null
  actual_end: string | null
  attendee_count: number
  actions: Array<{
    action_type: string
    reasoning: string
    suggested_stage?: string
  }>
}

// Grace period: wait this many minutes after scheduled end before checking
const CHECK_GRACE_MINUTES = 10
// How long to wait for someone to join before declaring no-show
const NO_SHOW_GRACE_MINUTES = 15

/**
 * Check a single booking's Google Calendar event for attendance data.
 */
async function checkBookingAttendance(
  supabase: SupabaseClient,
  booking: BookingRow
): Promise<TrackingResult | null> {
  if (!booking.google_event_id) {
    // No calendar event — can't auto-track, needs manual input
    return null
  }

  const config = await loadGoogleConfig(supabase)
  if (!config || !config.calendar_active) return null

  const calendar = await getCalendarClient(supabase, config)

  try {
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: booking.google_event_id,
    })

    const eventData = event.data
    const actions: TrackingResult['actions'] = []

    // Check event status
    if (eventData.status === 'cancelled') {
      return {
        outcome: 'cancelled',
        customer_joined: false,
        owner_joined: false,
        actual_start: null,
        actual_end: null,
        attendee_count: 0,
        actions: [{
          action_type: 'auto_move',
          reasoning: 'Calendar event was cancelled',
        }],
      }
    }

    // Check attendee responses
    const attendees = eventData.attendees ?? []
    const ownerEmail = config.email
    let customerAccepted = false
    let customerDeclined = false
    let customerNoResponse = false
    let ownerAccepted = true // Owner is the organiser, assumed accepted

    for (const att of attendees) {
      if (att.email === ownerEmail) {
        ownerAccepted = att.responseStatus === 'accepted' || att.responseStatus === 'tentative'
      } else {
        // Customer attendee
        if (att.responseStatus === 'accepted') customerAccepted = true
        else if (att.responseStatus === 'declined') customerDeclined = true
        else customerNoResponse = true
      }
    }

    // For video calls, check conference data for participant info
    // Google Calendar API doesn't expose Meet participant data directly,
    // so we infer from event timing and attendee responses
    const isVideoCall = booking.type === 'call1' || booking.type === 'call2'
    const scheduledEnd = new Date(new Date(booking.scheduled_at).getTime() + booking.duration_min * 60 * 1000)
    const now = new Date()

    // If customer explicitly declined
    if (customerDeclined) {
      return {
        outcome: 'cancelled',
        customer_joined: false,
        owner_joined: false,
        actual_start: null,
        actual_end: null,
        attendee_count: 0,
        actions: [{
          action_type: 'auto_move',
          reasoning: 'Customer declined the calendar invite',
        }],
      }
    }

    // Check if the event has actually ended (with grace period)
    const checkTime = new Date(scheduledEnd.getTime() + NO_SHOW_GRACE_MINUTES * 60 * 1000)
    if (now < checkTime) {
      // Too early to determine outcome — meeting might still be happening
      return null
    }

    // Event has ended. For video calls, we check if the event was "used"
    // by looking at the updated timestamp vs created timestamp.
    // If the event was modified during the meeting window, someone likely joined.
    const eventUpdated = eventData.updated ? new Date(eventData.updated) : null
    const eventCreated = eventData.created ? new Date(eventData.created) : null
    const scheduledStart = new Date(booking.scheduled_at)

    // Heuristic: if event was updated during or after the meeting window,
    // it's likely that participants interacted with it
    const wasActivelyUsed = eventUpdated && eventCreated &&
      eventUpdated.getTime() > scheduledStart.getTime() &&
      eventUpdated.getTime() !== eventCreated.getTime()

    if (isVideoCall) {
      // For video calls, if customer accepted and event shows activity, mark completed
      if (customerAccepted && wasActivelyUsed) {
        return {
          outcome: 'completed',
          customer_joined: true,
          owner_joined: true,
          actual_start: booking.scheduled_at,
          actual_end: scheduledEnd.toISOString(),
          attendee_count: 2,
          actions: [{
            action_type: 'auto_move',
            reasoning: 'Customer accepted invite and event shows activity during meeting window',
          }],
        }
      }

      // Customer accepted but no activity — might have been a no-show
      if (customerAccepted && !wasActivelyUsed) {
        // Ambiguous — flag for manual review
        actions.push({
          action_type: 'reminder_sent',
          reasoning: 'Customer accepted invite but no meeting activity detected. Please confirm the outcome.',
        })
        return {
          outcome: 'pending', // Keep pending, owner needs to confirm
          customer_joined: false,
          owner_joined: false,
          actual_start: null,
          actual_end: null,
          attendee_count: 0,
          actions,
        }
      }

      // Customer never responded and no activity — likely no-show
      if (customerNoResponse && !wasActivelyUsed) {
        return {
          outcome: 'no_show',
          customer_joined: false,
          owner_joined: true, // Assume owner was ready
          actual_start: null,
          actual_end: null,
          attendee_count: 0,
          actions: [{
            action_type: 'auto_no_show',
            reasoning: 'Customer never responded to invite and no meeting activity detected',
          }],
        }
      }

      // Fallback: event ended, some activity, but unclear
      if (wasActivelyUsed) {
        return {
          outcome: 'completed',
          customer_joined: true,
          owner_joined: true,
          actual_start: booking.scheduled_at,
          actual_end: scheduledEnd.toISOString(),
          attendee_count: attendees.length || 2,
          actions: [{
            action_type: 'auto_move',
            reasoning: 'Event shows activity during meeting window',
          }],
        }
      }

      // No activity at all
      return {
        outcome: 'no_show',
        customer_joined: false,
        owner_joined: false,
        actual_start: null,
        actual_end: null,
        attendee_count: 0,
        actions: [{
          action_type: 'auto_no_show',
          reasoning: 'No meeting activity detected after scheduled end time',
        }],
      }
    }

    // For in-person meetings (onboarding), we can't auto-detect attendance
    // Just flag for manual review
    actions.push({
      action_type: 'reminder_sent',
      reasoning: 'In-person visit time has passed. Please update the outcome.',
    })
    return {
      outcome: 'pending',
      customer_joined: false,
      owner_joined: false,
      actual_start: null,
      actual_end: null,
      attendee_count: 0,
      actions,
    }
  } catch (err: any) {
    console.error(`[MEETING-TRACKER] Error checking event ${booking.google_event_id}:`, err.message)
    return null
  }
}

/**
 * Monitor upcoming bookings for pre-meeting signals:
 * - Customer declined invite
 * - Customer hasn't responded (24h before)
 * - Event cancelled/rescheduled
 */
async function monitorUpcomingBookings(supabase: SupabaseClient): Promise<number> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Find pending bookings in the next 24 hours
  const { data: upcoming } = await supabase
    .from('bookings')
    .select('id, opportunity_id, type, scheduled_at, duration_min, owner_user_id, google_event_id, outcome, tracking_status')
    .eq('outcome', 'pending')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in24h.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(20)

  if (!upcoming?.length) return 0

  const config = await loadGoogleConfig(supabase)
  if (!config || !config.calendar_active) return 0

  const calendar = await getCalendarClient(supabase, config)
  let flagged = 0

  for (const booking of upcoming as BookingRow[]) {
    if (!booking.google_event_id) continue

    try {
      const event = await calendar.events.get({
        calendarId: 'primary',
        eventId: booking.google_event_id,
      })

      const eventData = event.data

      // Check if event was cancelled
      if (eventData.status === 'cancelled') {
        await supabase
          .from('bookings')
          .update({ outcome: 'cancelled', tracking_status: 'checked' })
          .eq('id', booking.id)

        await handleCancelled(supabase, booking)

        await supabase.from('post_call_actions').insert({
          booking_id: booking.id,
          opportunity_id: booking.opportunity_id,
          action_type: 'auto_move',
          reasoning: 'Calendar event was cancelled before the meeting',
        })

        flagged++
        continue
      }

      // Check if event time changed (rescheduled externally)
      const eventStart = eventData.start?.dateTime
      if (eventStart) {
        const eventStartDate = new Date(eventStart)
        const bookingDate = new Date(booking.scheduled_at)
        const timeDiff = Math.abs(eventStartDate.getTime() - bookingDate.getTime())

        if (timeDiff > 5 * 60 * 1000) { // More than 5 min difference
          // Update booking to match calendar
          await supabase
            .from('bookings')
            .update({ scheduled_at: eventStartDate.toISOString() })
            .eq('id', booking.id)

          await supabase.from('post_call_actions').insert({
            booking_id: booking.id,
            opportunity_id: booking.opportunity_id,
            action_type: 'auto_move',
            reasoning: `Meeting rescheduled via calendar to ${eventStartDate.toLocaleDateString('en-GB')} at ${eventStartDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
          })

          flagged++
          continue
        }
      }

      // Check attendee responses
      const attendees = eventData.attendees ?? []
      for (const att of attendees) {
        if (att.email === config.email) continue // Skip owner

        if (att.responseStatus === 'declined') {
          // Customer declined — flag and create task
          const { data: opp } = await supabase
            .from('opportunities')
            .select('lead_id, owner_user_id')
            .eq('id', booking.opportunity_id)
            .single()

          if (opp) {
            const { data: lead } = await supabase
              .from('leads')
              .select('name, phone')
              .eq('id', opp.lead_id)
              .single()

            // Check if we already flagged this
            const { data: existing } = await supabase
              .from('post_call_actions')
              .select('id')
              .eq('booking_id', booking.id)
              .eq('action_type', 'reminder_sent')
              .ilike('reasoning', '%declined%')
              .limit(1)

            if (!existing?.length) {
              await supabase.from('tasks').insert({
                opportunity_id: booking.opportunity_id,
                type: 'invite_declined',
                due_at: new Date().toISOString(),
                owner_user_id: opp.owner_user_id,
                status: 'open',
                description: `${lead?.name ?? 'Customer'} declined the ${booking.type} invite. Reach out to reschedule.`,
              })

              await supabase.from('post_call_actions').insert({
                booking_id: booking.id,
                opportunity_id: booking.opportunity_id,
                action_type: 'reminder_sent',
                reasoning: `Customer declined calendar invite for ${booking.type}`,
              })

              // Send a WhatsApp/SMS asking if they want to reschedule
              if (lead?.phone) {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
                const params = new URLSearchParams({
                  type: booking.type,
                  opp: booking.opportunity_id,
                  name: lead.name ?? '',
                })
                const rescheduleLink = `${baseUrl}/book?${params.toString()}`
                const firstName = (lead.name ?? '').split(' ')[0]

                await supabase.from('message_logs').insert({
                  lead_id: opp.lead_id,
                  channel: 'sms',
                  template: 'invite_declined_followup',
                  status: 'queued',
                  metadata: {
                    subject: 'Need to reschedule?',
                    body: `Hi ${firstName}, we noticed you might not be able to make your upcoming appointment. No worries — pick a new time here: ${rescheduleLink}`,
                    auto_triggered: true,
                    opportunity_id: booking.opportunity_id,
                  },
                })
              }

              flagged++
            }
          }
        }

        // Customer hasn't responded and meeting is within 6 hours
        const hoursUntil = (new Date(booking.scheduled_at).getTime() - now.getTime()) / (60 * 60 * 1000)
        if (att.responseStatus === 'needsAction' && hoursUntil <= 6) {
          // Check if we already sent a reminder for this
          const { data: existing } = await supabase
            .from('post_call_actions')
            .select('id')
            .eq('booking_id', booking.id)
            .eq('action_type', 'reminder_sent')
            .ilike('reasoning', '%no response%')
            .limit(1)

          if (!existing?.length) {
            const { data: opp } = await supabase
              .from('opportunities')
              .select('lead_id, owner_user_id')
              .eq('id', booking.opportunity_id)
              .single()

            if (opp) {
              await supabase.from('tasks').insert({
                opportunity_id: booking.opportunity_id,
                type: 'invite_no_response',
                due_at: new Date().toISOString(),
                owner_user_id: opp.owner_user_id,
                status: 'open',
                description: `Customer hasn't responded to the ${booking.type} invite (${Math.round(hoursUntil)}h away). Consider reaching out.`,
              })

              await supabase.from('post_call_actions').insert({
                booking_id: booking.id,
                opportunity_id: booking.opportunity_id,
                action_type: 'reminder_sent',
                reasoning: `Customer has not responded to invite — meeting in ${Math.round(hoursUntil)} hours (no response flag)`,
              })

              flagged++
            }
          }
        }
      }
    } catch (err: any) {
      console.error(`[MEETING-TRACKER] Pre-meeting check error for ${booking.id}:`, err.message)
    }
  }

  return flagged
}

/**
 * Process all bookings that need tracking.
 * Called by cron job every 5 minutes.
 */
export async function processMeetingTracking(supabase: SupabaseClient): Promise<{
  checked: number
  updated: number
  errors: number
  preMeetingFlagged: number
}> {
  const now = new Date()
  // Find bookings where: outcome is pending, tracking_status is pending,
  // and scheduled_at + duration + grace has passed
  const cutoff = new Date(now.getTime() - CHECK_GRACE_MINUTES * 60 * 1000)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, opportunity_id, type, scheduled_at, duration_min, owner_user_id, google_event_id, meet_link, outcome, tracking_status')
    .eq('outcome', 'pending')
    .eq('tracking_status', 'pending')
    .lte('scheduled_at', cutoff.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(20)

  // Run pre-meeting monitoring first
  let preMeetingFlagged = 0
  try {
    preMeetingFlagged = await monitorUpcomingBookings(supabase)
  } catch (err: any) {
    console.error('[MEETING-TRACKER] Pre-meeting monitoring error:', err.message)
  }

  if (!bookings?.length) return { checked: 0, updated: 0, errors: 0, preMeetingFlagged }

  let updated = 0
  let errors = 0

  for (const booking of bookings as BookingRow[]) {
    try {
      const result = await checkBookingAttendance(supabase, booking)

      if (!result) {
        // Can't determine — mark as checked so we don't keep retrying
        // (owner will need to manually update)
        await supabase
          .from('bookings')
          .update({ tracking_status: 'checked' })
          .eq('id', booking.id)
        continue
      }

      // Update booking with tracking data
      const updateData: Record<string, unknown> = {
        tracking_status: 'checked',
        customer_joined: result.customer_joined,
        owner_joined: result.owner_joined,
        attendee_count: result.attendee_count,
      }

      if (result.actual_start) updateData.actual_start = result.actual_start
      if (result.actual_end) updateData.actual_end = result.actual_end

      // Only update outcome if we have a definitive result
      if (result.outcome !== 'pending') {
        updateData.outcome = result.outcome
      }

      await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id)

      // Log actions
      for (const action of result.actions) {
        await supabase.from('post_call_actions').insert({
          booking_id: booking.id,
          opportunity_id: booking.opportunity_id,
          action_type: action.action_type,
          reasoning: action.reasoning,
          suggested_stage: action.suggested_stage ?? null,
        })
      }

      // Handle auto-actions based on outcome
      if (result.outcome === 'no_show') {
        await handleNoShow(supabase, booking)
      } else if (result.outcome === 'cancelled') {
        await handleCancelled(supabase, booking)
      } else if (result.outcome === 'completed') {
        await handleCompleted(supabase, booking)
      }

      updated++
    } catch (err: any) {
      console.error(`[MEETING-TRACKER] Error processing booking ${booking.id}:`, err.message)
      errors++
    }
  }

  return { checked: bookings.length, updated, errors, preMeetingFlagged }
}

/**
 * Handle no-show: queue follow-up message + reschedule link, create task.
 */
async function handleNoShow(supabase: SupabaseClient, booking: BookingRow) {
  // Get lead info
  const { data: opp } = await supabase
    .from('opportunities')
    .select('lead_id, owner_user_id')
    .eq('id', booking.opportunity_id)
    .single()
  if (!opp) return

  const { data: lead } = await supabase
    .from('leads')
    .select('name, email, phone')
    .eq('id', opp.lead_id)
    .single()
  if (!lead) return

  const firstName = (lead.name ?? '').split(' ')[0]
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

  // Build reschedule link
  const bookingType = booking.type
  const params = new URLSearchParams({
    type: bookingType,
    opp: booking.opportunity_id,
    name: lead.name ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
  })
  const rescheduleLink = `${baseUrl}/book?${params.toString()}`

  const noShowBody = `Hi ${firstName},\n\nWe missed you at your scheduled ${bookingType === 'call1' ? 'consultation' : bookingType === 'call2' ? 'design call' : 'visit'} today.\n\nNo worries — you can rebook at a time that suits you:\n${rescheduleLink}\n\nIf you have any questions, just reply to this message.\n\nBest,\nPaxBespoke`

  // Queue follow-up on all channels
  for (const channel of ['email', 'sms', 'whatsapp'] as const) {
    if (channel === 'email' && !lead.email) continue
    if ((channel === 'sms' || channel === 'whatsapp') && !lead.phone) continue

    await supabase.from('message_logs').insert({
      lead_id: opp.lead_id,
      channel,
      template: 'no_show_followup',
      status: 'queued',
      metadata: {
        subject: `We missed you — rebook your ${bookingType === 'call1' ? 'consultation' : 'call'}`,
        body: noShowBody,
        auto_triggered: true,
        trigger_stage: 'no_show',
        opportunity_id: booking.opportunity_id,
      },
    })
  }

  // Create task for owner
  await supabase.from('tasks').insert({
    opportunity_id: booking.opportunity_id,
    type: 'follow_up_no_show',
    due_at: new Date().toISOString(),
    owner_user_id: opp.owner_user_id,
    status: 'open',
    description: `No-show: ${lead.name} missed their ${bookingType} on ${new Date(booking.scheduled_at).toLocaleDateString('en-GB')}. Follow-up message sent automatically.`,
  })
}

/**
 * Handle cancelled: create reschedule task.
 */
async function handleCancelled(supabase: SupabaseClient, booking: BookingRow) {
  const { data: opp } = await supabase
    .from('opportunities')
    .select('lead_id, owner_user_id')
    .eq('id', booking.opportunity_id)
    .single()
  if (!opp) return

  const { data: lead } = await supabase
    .from('leads')
    .select('name')
    .eq('id', opp.lead_id)
    .single()

  await supabase.from('tasks').insert({
    opportunity_id: booking.opportunity_id,
    type: 'reschedule_cancelled',
    due_at: new Date().toISOString(),
    owner_user_id: opp.owner_user_id,
    status: 'open',
    description: `Cancelled: ${lead?.name ?? 'Customer'} cancelled their ${booking.type}. Reach out to reschedule.`,
  })
}

/**
 * Handle completed: prompt owner for notes (1-hour timer).
 */
async function handleCompleted(supabase: SupabaseClient, booking: BookingRow) {
  const { data: opp } = await supabase
    .from('opportunities')
    .select('lead_id, owner_user_id')
    .eq('id', booking.opportunity_id)
    .single()
  if (!opp) return

  const { data: lead } = await supabase
    .from('leads')
    .select('name')
    .eq('id', opp.lead_id)
    .single()

  // Create a task prompting for notes
  await supabase.from('tasks').insert({
    opportunity_id: booking.opportunity_id,
    type: 'post_call_notes',
    due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Due in 1 hour
    owner_user_id: opp.owner_user_id,
    status: 'open',
    description: `Add notes for your ${booking.type === 'call1' ? 'discovery call' : booking.type === 'call2' ? 'design call' : 'onboarding visit'} with ${lead?.name ?? 'customer'}. This helps the AI suggest the right next step.`,
  })

  // Log the action
  await supabase.from('post_call_actions').insert({
    booking_id: booking.id,
    opportunity_id: booking.opportunity_id,
    action_type: 'reminder_sent',
    reasoning: 'Meeting completed — prompted owner for post-call notes',
  })
}
