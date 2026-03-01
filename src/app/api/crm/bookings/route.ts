import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncBookingToCalendar, queryFreeBusy } from '@/lib/crm/calendar'
import { runStageAutomations } from '@/lib/crm/automation'
import type { BookingType, OpportunityStage } from '@/lib/crm/types'
import { z } from 'zod'

const bookingSchema = z.object({
  opportunity_id: z.string().uuid(),
  type: z.enum(['call1', 'call2', 'onboarding']),
  scheduled_at: z.string().min(1),
  duration_min: z.number().min(10).max(180).default(30),
})

const BOOKING_STAGE_MAP: Record<string, OpportunityStage> = {
  call1: 'call1_scheduled',
  call2: 'call2_scheduled',
  onboarding: 'onboarding_scheduled',
}

/**
 * POST /api/crm/bookings
 * Create a booking from the CRM, sync to Google Calendar, trigger automations.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { opportunity_id, type, scheduled_at, duration_min } = parsed.data
  const scheduledDate = new Date(scheduled_at)
  const slotEnd = new Date(scheduledDate.getTime() + duration_min * 60 * 1000)

  // Verify opportunity exists and get lead info
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, lead_id, owner_user_id')
    .eq('id', opportunity_id)
    .single()

  if (oppErr || !opp) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('name, email, phone')
    .eq('id', opp.lead_id)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Double-booking prevention: check Google Calendar
  try {
    const busy = await queryFreeBusy(supabase, scheduledDate.toISOString(), slotEnd.toISOString())
    const hasConflict = busy.some((b) => {
      const bStart = new Date(b.start)
      const bEnd = new Date(b.end)
      return scheduledDate < bEnd && slotEnd > bStart
    })
    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time slot conflicts with an existing calendar event.' },
        { status: 409 }
      )
    }
  } catch {
    // FreeBusy unavailable — continue with DB check
  }

  // Double-booking prevention: check existing bookings in DB
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
        { error: 'This time slot conflicts with an existing booking.' },
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
      duration_min,
      owner_user_id: opp.owner_user_id ?? user.id,
      outcome: 'pending',
    })
    .select()
    .single()

  if (bookingErr) {
    return NextResponse.json({ error: bookingErr.message }, { status: 500 })
  }

  // Sync to Google Calendar (with Meet link for video calls)
  let meetLink: string | undefined
  try {
    const calResult = await syncBookingToCalendar(
      supabase, booking, lead.name ?? 'Customer', lead.email ?? undefined
    )
    meetLink = calResult?.meetLink
  } catch (err) {
    console.error('[CRM BOOKING] Calendar sync error:', err)
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
      changed_by: user.id,
      notes: `Booking created from CRM`,
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
    owner_user_id: opp.owner_user_id ?? user.id,
    status: 'open',
    description: `${typeLabels[type] ?? type} with ${lead.name}${meetLink ? `\nMeet: ${meetLink}` : ''}`,
  })

  // Trigger automations (confirmation + reminders)
  if (newStage) {
    runStageAutomations(supabase, opportunity_id, newStage, scheduledDate, meetLink).catch((err) =>
      console.error('[CRM BOOKING] Automation error:', err)
    )
  }

  return NextResponse.json({
    booking,
    meetLink,
    stage: newStage,
  }, { status: 201 })
}

/**
 * GET /api/crm/bookings?opportunity_id=...
 * List bookings for an opportunity.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oppId = req.nextUrl.searchParams.get('opportunity_id')

  let query = supabase
    .from('bookings')
    .select('*')
    .order('scheduled_at', { ascending: false })

  if (oppId) {
    query = query.eq('opportunity_id', oppId)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
