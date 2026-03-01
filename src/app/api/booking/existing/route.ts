import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncBookingToCalendar, queryFreeBusy } from '@/lib/crm/calendar'
import { runStageAutomations } from '@/lib/crm/automation'
import { rateLimit } from '@/lib/rate-limit'
import type { OpportunityStage } from '@/lib/crm/types'
import { z } from 'zod'

const schema = z.object({
  opportunity_id: z.string().uuid(),
  type: z.enum(['call1', 'call2', 'onboarding']),
  scheduled_at: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

const BOOKING_STAGE_MAP: Record<string, OpportunityStage> = {
  call1: 'call1_scheduled',
  call2: 'call2_scheduled',
  onboarding: 'onboarding_scheduled',
}

/**
 * POST /api/booking/existing
 * Public endpoint for pre-filled booking links.
 * Creates a booking on an existing opportunity (no new lead).
 */
export async function POST(request: NextRequest) {
  const bypassSecret = request.headers.get('x-webhook-secret')
  if (bypassSecret !== process.env.CRM_WEBHOOK_SECRET) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = rateLimit(`booking-existing:${ip}`, { limit: 5, windowSeconds: 600 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }
  }

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    const { opportunity_id, type, scheduled_at, name, email } = parsed.data
    const supabase = createAdminClient()
    const scheduledDate = new Date(scheduled_at)
    const slotEnd = new Date(scheduledDate.getTime() + 30 * 60 * 1000)

    // Verify opportunity exists
    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, lead_id, owner_user_id')
      .eq('id', opportunity_id)
      .single()

    if (!opp) {
      return NextResponse.json({ error: 'Booking link is invalid or expired.' }, { status: 404 })
    }

    // Double-booking prevention: Google Calendar
    try {
      const busy = await queryFreeBusy(supabase, scheduledDate.toISOString(), slotEnd.toISOString())
      const hasConflict = busy.some((b) => {
        const bStart = new Date(b.start)
        const bEnd = new Date(b.end)
        return scheduledDate < bEnd && slotEnd > bStart
      })
      if (hasConflict) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please choose a different time.' },
          { status: 409 }
        )
      }
    } catch {
      // FreeBusy unavailable
    }

    // Double-booking prevention: DB
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, scheduled_at, duration_min')
      .gte('scheduled_at', new Date(scheduledDate.getTime() - 60 * 60 * 1000).toISOString())
      .lte('scheduled_at', new Date(scheduledDate.getTime() + 60 * 60 * 1000).toISOString())
      .neq('outcome', 'rescheduled')
      .neq('outcome', 'no_show')

    if (existingBookings?.length) {
      const dbConflict = existingBookings.some((b) => {
        const bStart = new Date(b.scheduled_at)
        const bEnd = new Date(bStart.getTime() + (b.duration_min ?? 30) * 60 * 1000)
        return scheduledDate < bEnd && slotEnd > bStart
      })
      if (dbConflict) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please choose a different time.' },
          { status: 409 }
        )
      }
    }

    // Create booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        opportunity_id,
        type,
        scheduled_at: scheduledDate.toISOString(),
        duration_min: 30,
        owner_user_id: opp.owner_user_id,
        outcome: 'pending',
      })
      .select()
      .single()

    if (bookingErr) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Sync to Google Calendar
    let meetLink: string | undefined
    try {
      const calResult = await syncBookingToCalendar(
        supabase, booking, name, email ?? undefined
      )
      meetLink = calResult?.meetLink
    } catch (err) {
      console.error('[BOOKING/EXISTING] Calendar sync error:', err)
    }

    // Update opportunity stage
    const newStage = BOOKING_STAGE_MAP[type]
    if (newStage) {
      await supabase
        .from('opportunities')
        .update({ stage: newStage })
        .eq('id', opportunity_id)

      await supabase.from('stage_log').insert({
        opportunity_id,
        to_stage: newStage,
        notes: `Booked via customer booking link`,
      })
    }

    // Create task
    const typeLabels: Record<string, string> = {
      call1: 'Discovery Call',
      call2: 'Design Call',
      onboarding: 'Onboarding Visit',
    }
    await supabase.from('tasks').insert({
      opportunity_id,
      type: `${type}_scheduled`,
      due_at: scheduledDate.toISOString(),
      owner_user_id: opp.owner_user_id,
      status: 'open',
      description: `${typeLabels[type] ?? type} with ${name}${meetLink ? `\nMeet: ${meetLink}` : ''}`,
    })

    // Trigger automations
    if (newStage) {
      runStageAutomations(supabase, opportunity_id, newStage, scheduledDate, meetLink).catch((err) =>
        console.error('[BOOKING/EXISTING] Automation error:', err)
      )
    }

    return NextResponse.json({ success: true, meetLink }, { status: 201 })
  } catch (err) {
    console.error('[BOOKING/EXISTING] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
