import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignOwner } from '@/lib/crm/routing'
import { syncBookingToCalendar, queryFreeBusy } from '@/lib/crm/calendar'
import { runStageAutomations } from '@/lib/crm/automation'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const bookingSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  postcode: z.string().optional(),
  postcodeLocation: z.string().optional(),
  room: z.string().optional(),
  style: z.string().optional(),
  packageChoice: z.string().optional(),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  measurements: z.string().optional(),
  whatsappOptIn: z.boolean().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  // Attribution
  visitor_id: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  landing_page: z.string().optional(),
  referrer: z.string().optional(),
  first_visit_at: z.string().optional(),
  device_type: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Rate limit: 5 bookings per IP per 10 minutes (bypass with webhook secret for testing)
  const bypassSecret = request.headers.get('x-webhook-secret')
  if (bypassSecret !== process.env.CRM_WEBHOOK_SECRET) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = rateLimit(`booking:${ip}`, { limit: 5, windowSeconds: 600 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }
  }

  try {
    const body = await request.json()
    const parsed = bookingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createAdminClient()

    // Parse the booking date/time early so we can check for conflicts
    const scheduledAt = parseBookingDateTime(data.date, data.time)
    const slotEnd = new Date(scheduledAt.getTime() + 30 * 60 * 1000)

    // Server-side double-booking prevention
    // Check 1: Google Calendar FreeBusy
    try {
      const busy = await queryFreeBusy(supabase, scheduledAt.toISOString(), slotEnd.toISOString())
      const hasConflict = busy.some((b) => {
        const bStart = new Date(b.start)
        const bEnd = new Date(b.end)
        return scheduledAt < bEnd && slotEnd > bStart
      })
      if (hasConflict) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please choose a different time.' },
          { status: 409 }
        )
      }
    } catch {
      // If FreeBusy fails (no Google connected), fall through to DB check
    }

    // Check 2: Existing bookings in DB (secondary guard)
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, scheduled_at, duration_min')
      .gte('scheduled_at', new Date(scheduledAt.getTime() - 60 * 60 * 1000).toISOString())
      .lte('scheduled_at', new Date(scheduledAt.getTime() + 60 * 60 * 1000).toISOString())
      .neq('outcome', 'rescheduled')
      .neq('outcome', 'no_show')

    if (existingBookings?.length) {
      const dbConflict = existingBookings.some((b) => {
        const bStart = new Date(b.scheduled_at)
        const bEnd = new Date(bStart.getTime() + (b.duration_min ?? 30) * 60 * 1000)
        return scheduledAt < bEnd && slotEnd > bStart
      })
      if (dbConflict) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please choose a different time.' },
          { status: 409 }
        )
      }
    }

    // Assign owner based on postcode
    let ownerId: string | null = null
    if (data.postcode) {
      try {
        ownerId = await assignOwner(supabase, data.postcode)
      } catch {
        // No available user — leave unassigned
      }
    }

    // Build notes from form data
    const notesParts: string[] = []
    if (data.room) notesParts.push(`Room: ${data.room}`)
    if (data.style) notesParts.push(`Style: ${data.style}`)
    if (data.packageChoice) notesParts.push(`Package: ${data.packageChoice}`)
    if (data.budgetRange) notesParts.push(`Budget: ${data.budgetRange}`)
    if (data.timeline) notesParts.push(`Timeline: ${data.timeline}`)
    if (data.measurements) notesParts.push(`Measurements: ${data.measurements}`)
    if (data.postcodeLocation) notesParts.push(`Location: ${data.postcodeLocation}`)
    if (data.whatsappOptIn) notesParts.push('WhatsApp opt-in: Yes')
    const notes = notesParts.join('\n')

    // Classify traffic source from UTM or referrer
    const trafficSource = classifySource(data.utm_source, data.utm_medium, data.referrer)

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        postcode: data.postcode ?? null,
        project_type: data.room ?? null,
        budget_band: data.budgetRange ?? null,
        source: 'booking_form',
        notes,
        owner_user_id: ownerId,
        status: 'new',
        // Attribution
        traffic_source: trafficSource,
        utm_source: data.utm_source ?? null,
        utm_medium: data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        utm_content: data.utm_content ?? null,
        utm_term: data.utm_term ?? null,
        landing_page: data.landing_page ?? null,
        referrer: data.referrer ?? null,
        device_type: data.device_type ?? null,
        first_visit_at: data.first_visit_at ?? null,
        visitor_id: data.visitor_id ?? null,
      })
      .select()
      .single()

    if (leadError) {
      console.error('Lead creation error:', leadError)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    // Create opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .insert({
        lead_id: lead.id,
        stage: 'call1_scheduled',
        owner_user_id: ownerId,
      })
      .select()
      .single()

    if (oppError) {
      console.error('Opportunity creation error:', oppError)
      return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 })
    }

    // Create booking record (call1 type since this is the initial consultation)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        opportunity_id: opportunity.id,
        type: 'call1',
        scheduled_at: scheduledAt.toISOString(),
        duration_min: 30,
        owner_user_id: ownerId,
        outcome: 'pending',
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
    }

    // Sync to Google Calendar with Meet link
    let meetLink: string | undefined
    if (booking) {
      try {
        const calResult = await syncBookingToCalendar(supabase, booking, data.name, data.email)
        meetLink = calResult?.meetLink
        if (meetLink) {
          console.log(`[BOOKING] Meet link created: ${meetLink}`)
        }
      } catch (err) {
        console.error('Calendar sync error:', err)
      }
    }

    // Create task for the call
    await supabase.from('tasks').insert({
      opportunity_id: opportunity.id,
      type: 'call1_scheduled',
      due_at: scheduledAt.toISOString(),
      owner_user_id: ownerId,
      status: 'open',
      description: `Call 1 with ${data.name} - ${data.date} at ${data.time}${meetLink ? `\nMeet: ${meetLink}` : ''}`,
    })

    // Log stage
    await supabase.from('stage_log').insert({
      opportunity_id: opportunity.id,
      to_stage: 'call1_scheduled',
      notes: 'Auto-created from booking form',
    })

    // Trigger stage automations (sends confirmation email/SMS/WhatsApp)
    runStageAutomations(supabase, opportunity.id, 'call1_scheduled', scheduledAt, meetLink).catch((err) =>
      console.error('Stage automation error:', err)
    )

    // Update owner's active_opportunities count
    if (ownerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_opportunities')
        .eq('id', ownerId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({ active_opportunities: (profile.active_opportunities ?? 0) + 1 })
          .eq('id', ownerId)
      }
    }

    return NextResponse.json(
      { lead_id: lead.id, opportunity_id: opportunity.id, success: true },
      { status: 201 }
    )
  } catch (err) {
    console.error('Booking API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Parses "Mon 3 Mar" + "10:00" into a Date object for the current/next year.
 */
function parseBookingDateTime(dateStr: string, timeStr: string): Date {
  const now = new Date()
  const currentYear = now.getFullYear()

  // Extract day number and month from "Mon 3 Mar"
  const parts = dateStr.trim().split(/\s+/)
  const dayNum = parseInt(parts[1], 10)
  const monthStr = parts[2]

  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }

  const month = months[monthStr] ?? 0
  const [hours, minutes] = timeStr.split(':').map(Number)

  let date = new Date(currentYear, month, dayNum, hours, minutes)

  // If the date is in the past, it must be next year
  if (date < now) {
    date = new Date(currentYear + 1, month, dayNum, hours, minutes)
  }

  return date
}

function classifySource(
  utmSource: string | null | undefined,
  utmMedium: string | null | undefined,
  referrer: string | null | undefined
): string {
  if (utmSource) {
    const src = utmSource.toLowerCase()
    if (src.includes('google')) return utmMedium === 'cpc' ? 'Google Ads' : 'Google Organic'
    if (src.includes('facebook') || src.includes('fb')) return 'Facebook'
    if (src.includes('instagram') || src.includes('ig')) return 'Instagram'
    return utmSource
  }
  if (referrer) {
    const ref = referrer.toLowerCase()
    if (ref.includes('google')) return 'Google Organic'
    if (ref.includes('facebook')) return 'Facebook'
    if (ref.includes('instagram')) return 'Instagram'
    if (ref.includes('tiktok')) return 'TikTok'
    return 'Referral'
  }
  return 'Direct'
}
