import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePortalAuth } from '@/lib/crm/portal-auth'
import { updateCalendarEvent, deleteCalendarEvent, queryFreeBusy } from '@/lib/crm/calendar'
import { cancelQueuedMessages } from '@/lib/crm/automation'
import { generateAllCTAUrls } from '@/lib/crm/cta-tokens'
import { sendEmail } from '@/lib/crm/messaging/channels'

type PortalAction = 'reschedule' | 'cancel'

interface ActionRequest {
  booking_id: string
  action: PortalAction
  scheduled_at?: string // ISO for reschedule
  reason?: string       // for cancel
}

// Duration defaults by booking type
const DURATION_MAP: Record<string, number> = {
  call1: 30, call2: 45, onboarding: 60, visit: 60, fitting: 240,
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Auth
  const body = await request.json()
  const token = body.token as string | undefined
  const sessionToken = body.session_token as string | undefined

  const auth = await resolvePortalAuth(admin, { token, session_token: sessionToken })
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const { leadId, opportunityIds } = auth
  const { booking_id, action, scheduled_at, reason } = body as ActionRequest

  if (!booking_id || !action) {
    return NextResponse.json({ error: 'booking_id and action are required' }, { status: 400 })
  }

  // Resolve the booking and verify ownership
  const resolved = await resolveBooking(admin, booking_id, opportunityIds)
  if (!resolved) {
    return NextResponse.json({ error: 'Booking not found or not yours' }, { status: 404 })
  }

  const { sourceTable, bookingData, opportunityId, googleEventId } = resolved

  // Fetch lead info
  const { data: lead } = await admin
    .from('leads')
    .select('name, email, phone')
    .eq('id', leadId)
    .single()

  const firstName = (lead?.name ?? '').split(' ')[0] || 'there'

  // Fetch opportunity for reschedule_count check
  const { data: opp } = await admin
    .from('opportunities')
    .select('reschedule_count, no_show_count, stage')
    .eq('id', opportunityId)
    .single()

  // ─── RESCHEDULE ────────────────────────────────────────────────────
  if (action === 'reschedule') {
    if (!scheduled_at) {
      return NextResponse.json({ error: 'New date/time is required' }, { status: 400 })
    }

    const newDate = new Date(scheduled_at)
    if (isNaN(newDate.getTime()) || newDate < new Date()) {
      return NextResponse.json({ error: 'Please select a future date and time' }, { status: 400 })
    }

    // Business hours check (Mon-Sat 8am-7pm)
    const day = newDate.getDay()
    const hour = newDate.getHours()
    if (day === 0 || hour < 8 || hour >= 19) {
      return NextResponse.json({ error: 'Please select a time between 8am-7pm, Monday to Saturday' }, { status: 400 })
    }

    // Max reschedule check
    const rescheduleCount = opp?.reschedule_count ?? 0
    if (rescheduleCount >= 3) {
      return NextResponse.json({
        error: 'This booking has been rescheduled multiple times. Please contact us directly to make changes.',
        contact: true,
      }, { status: 400 })
    }

    // FreeBusy conflict check
    const duration = DURATION_MAP[bookingData.type] ?? 30
    try {
      const endTime = new Date(newDate.getTime() + duration * 60 * 1000)
      const busy = await queryFreeBusy(admin, newDate.toISOString(), endTime.toISOString())
      if (busy && busy.length > 0) {
        return NextResponse.json({ error: 'This time slot is no longer available. Please choose a different time.' }, { status: 409 })
      }
    } catch {
      // FreeBusy unavailable — proceed anyway
    }

    // Update the booking
    if (sourceTable === 'bookings') {
      await admin.from('bookings').update({
        scheduled_at: newDate.toISOString(),
      }).eq('id', booking_id)
    } else if (sourceTable === 'visits') {
      await admin.from('visits').update({
        scheduled_at: newDate.toISOString(),
      }).eq('id', booking_id)
    } else if (sourceTable === 'fitting_slots') {
      await admin.from('fitting_slots').update({
        confirmed_date: newDate.toISOString(),
      }).eq('id', booking_id)
    }

    // Update Google Calendar
    if (googleEventId) {
      try {
        await updateCalendarEvent(admin, googleEventId, {
          startTime: newDate.toISOString(),
          durationMin: duration,
        })
      } catch (err) {
        console.error('[PORTAL] Google Calendar update failed:', err)
      }
    }

    // Cancel old queued messages and increment reschedule_count
    await cancelQueuedMessages(admin, leadId, opportunityId)

    if (opp) {
      await admin.from('opportunities').update({
        reschedule_count: (opp.reschedule_count ?? 0) + 1,
      }).eq('id', opportunityId)
    }

    // Stage log
    await admin.from('stage_log').insert({
      opportunity_id: opportunityId,
      from_stage: opp?.stage ?? null,
      to_stage: opp?.stage ?? null,
      notes: `Client rescheduled ${bookingData.type} via portal to ${newDate.toLocaleDateString('en-GB')} ${newDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
    }).then(() => {}, () => {})

    // Audit log
    await admin.from('portal_audit_log').insert({
      lead_id: leadId,
      booking_id,
      action: 'reschedule',
      ip_address: ip,
      metadata: {
        old_time: bookingData.scheduled_at,
        new_time: newDate.toISOString(),
        type: bookingData.type,
      },
    })

    // Send confirmation email
    const ctaUrls = generateAllCTAUrls(opportunityId)
    const dateStr = newDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    const timeStr = newDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    if (lead?.email) {
      await sendEmail(
        lead.email,
        `Your booking has been rescheduled, ${firstName}`,
        `Hi ${firstName},\n\nYour booking has been rescheduled to ${dateStr} at ${timeStr}.\n\n${bookingData.meet_link ? `Join your video call here:\n${bookingData.meet_link}\n\n` : ''}Need to make another change? Manage your booking:\n${ctaUrls.cta_manage_booking}\n\nSee you then!\nPaxBespoke`,
        admin,
      )
    }

    // Notify booking owner (internal)
    await notifyOwner(admin, opportunityId, `Client rescheduled their ${bookingData.type} to ${dateStr} at ${timeStr} via the self-service portal.`)

    return NextResponse.json({
      success: true,
      action: 'reschedule',
      message: `Rescheduled to ${dateStr} at ${timeStr}`,
      new_time: newDate.toISOString(),
    })
  }

  // ─── CANCEL ────────────────────────────────────────────────────────
  if (action === 'cancel') {
    // Check deposit
    const { data: deposits } = await admin
      .from('invoices')
      .select('id')
      .eq('opportunity_id', opportunityId)
      .eq('status', 'paid')
      .limit(1)

    if (deposits?.length) {
      return NextResponse.json({
        error: 'A deposit has been paid for this project. Please contact us directly to discuss cancellation.',
        contact: true,
      }, { status: 400 })
    }

    // Cancel the booking
    if (sourceTable === 'bookings') {
      await admin.from('bookings').update({ outcome: 'cancelled' }).eq('id', booking_id)
    } else if (sourceTable === 'visits') {
      await admin.from('visits').update({ outcome: 'cancelled' }).eq('id', booking_id)
    } else if (sourceTable === 'fitting_slots') {
      await admin.from('fitting_slots').update({ status: 'cancelled' }).eq('id', booking_id)
    }

    // Delete Google Calendar event
    if (googleEventId) {
      try { await deleteCalendarEvent(admin, googleEventId) } catch {}
    }

    // Cancel queued messages
    await cancelQueuedMessages(admin, leadId, opportunityId)

    // Stage log
    await admin.from('stage_log').insert({
      opportunity_id: opportunityId,
      from_stage: opp?.stage ?? null,
      to_stage: opp?.stage ?? null,
      notes: `Client cancelled ${bookingData.type} via portal${reason ? ': ' + reason : ''}`,
    }).then(() => {}, () => {})

    // Audit log
    await admin.from('portal_audit_log').insert({
      lead_id: leadId,
      booking_id,
      action: 'cancel',
      ip_address: ip,
      metadata: { type: bookingData.type, reason: reason ?? null },
    })

    // Send confirmation email
    if (lead?.email) {
      const dateStr = new Date(bookingData.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      const timeStr = new Date(bookingData.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      await sendEmail(
        lead.email,
        `Your booking has been cancelled, ${firstName}`,
        `Hi ${firstName},\n\nYour booking on ${dateStr} at ${timeStr} has been cancelled as requested.\n\nIf you change your mind, you can book a new consultation anytime at:\nhttps://paxbespoke.uk/book\n\nBest wishes,\nPaxBespoke`,
        admin,
      )
    }

    // Notify owner
    await notifyOwner(admin, opportunityId, `Client cancelled their ${bookingData.type} via the self-service portal.${reason ? ' Reason: ' + reason : ''}`)

    // Check if any remaining active bookings
    const { count } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', opportunityId)
      .eq('outcome', 'pending')

    return NextResponse.json({
      success: true,
      action: 'cancel',
      message: 'Your booking has been cancelled',
      no_remaining_bookings: (count ?? 0) === 0,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// ─── Helpers ──────────────────────────────────────────────────────────

interface ResolvedBooking {
  sourceTable: string
  bookingData: { type: string; scheduled_at: string; meet_link?: string }
  opportunityId: string
  googleEventId: string | null
}

async function resolveBooking(
  admin: ReturnType<typeof createAdminClient>,
  bookingId: string,
  allowedOppIds: string[],
): Promise<ResolvedBooking | null> {
  // Try bookings table
  const { data: booking } = await admin
    .from('bookings')
    .select('id, opportunity_id, type, scheduled_at, meet_link, google_event_id, outcome')
    .eq('id', bookingId)
    .single()

  if (booking && allowedOppIds.includes(booking.opportunity_id) && booking.outcome === 'pending') {
    return {
      sourceTable: 'bookings',
      bookingData: { type: booking.type, scheduled_at: booking.scheduled_at, meet_link: booking.meet_link },
      opportunityId: booking.opportunity_id,
      googleEventId: booking.google_event_id,
    }
  }

  // Try visits
  const { data: visit } = await admin
    .from('visits')
    .select('id, opportunity_id, scheduled_at, outcome, google_event_id')
    .eq('id', bookingId)
    .single()

  if (visit && allowedOppIds.includes(visit.opportunity_id) && ['pending', 'scheduled'].includes(visit.outcome ?? 'pending')) {
    return {
      sourceTable: 'visits',
      bookingData: { type: 'visit', scheduled_at: visit.scheduled_at },
      opportunityId: visit.opportunity_id,
      googleEventId: (visit as Record<string, unknown>).google_event_id as string | null,
    }
  }

  // Try fitting_slots
  const { data: fitting } = await admin
    .from('fitting_slots')
    .select('id, opportunity_id, confirmed_date, status, google_event_id')
    .eq('id', bookingId)
    .single()

  if (fitting && allowedOppIds.includes(fitting.opportunity_id) && fitting.status === 'confirmed') {
    return {
      sourceTable: 'fitting_slots',
      bookingData: { type: 'fitting', scheduled_at: fitting.confirmed_date },
      opportunityId: fitting.opportunity_id,
      googleEventId: (fitting as Record<string, unknown>).google_event_id as string | null,
    }
  }

  return null
}

async function notifyOwner(
  admin: ReturnType<typeof createAdminClient>,
  opportunityId: string,
  message: string,
) {
  // Fetch owner email
  const { data: opp } = await admin
    .from('opportunities')
    .select('owner_user_id')
    .eq('id', opportunityId)
    .single()

  if (!opp?.owner_user_id) return

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', opp.owner_user_id)
    .single()

  if (!profile?.email) return

  // Create a task for follow-up
  await admin.from('tasks').insert({
    opportunity_id: opportunityId,
    type: 'follow_up',
    description: message,
    owner_user_id: opp.owner_user_id,
    status: 'open',
    due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
  })

  // Send email notification
  await sendEmail(
    profile.email,
    'Client self-service action — PaxBespoke CRM',
    `Hi ${profile.full_name?.split(' ')[0] ?? 'there'},\n\n${message}\n\nA follow-up task has been created in the CRM.\n\nPaxBespoke CRM`,
    admin,
  )
}
