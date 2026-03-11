import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCalendarClientForUser } from '@/lib/crm/google'

// Public endpoint — no auth required (called from the booking flow)
// Returns active sales staff with their available slots for the next 14 days.

const SLOT_DURATION_MIN = 60 // standard consultation
const WORKING_HOURS = { start: 9, end: 18 } // 09:00–18:00
const DAYS_AHEAD = 14

function generateSlots(date: Date): Date[] {
  const slots: Date[] = []
  for (let h = WORKING_HOURS.start; h < WORKING_HOURS.end; h++) {
    for (const m of [0, 30]) {
      const slot = new Date(date)
      slot.setHours(h, m, 0, 0)
      slots.push(slot)
    }
  }
  return slots
}

function isSlotFree(
  slot: Date,
  busy: { start: string; end: string }[],
  durationMin: number
): boolean {
  const slotEnd = new Date(slot.getTime() + durationMin * 60_000)
  return !busy.some((b) => {
    const bStart = new Date(b.start)
    const bEnd = new Date(b.end)
    return slot < bEnd && slotEnd > bStart
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Fetch active sales staff
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, color, service_regions, google_calendar_connected')
      .eq('active', true)
      .eq('role', 'sales')
      .order('full_name')

    if (error) throw error
    if (!profiles?.length) {
      return NextResponse.json({ designers: [] })
    }

    const now = new Date()
    // Range: tomorrow → 14 days out
    const rangeStart = new Date(now)
    rangeStart.setDate(rangeStart.getDate() + 1)
    rangeStart.setHours(0, 0, 0, 0)
    const rangeEnd = new Date(rangeStart)
    rangeEnd.setDate(rangeEnd.getDate() + DAYS_AHEAD)

    // Build list of dates (skip Sundays)
    const dates: Date[] = []
    const d = new Date(rangeStart)
    while (d < rangeEnd) {
      if (d.getDay() !== 0) dates.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }

    // Query each designer's calendar in parallel
    const designers = await Promise.all(
      profiles.map(async (profile) => {
        let busyIntervals: { start: string; end: string }[] = []

        if (profile.google_calendar_connected) {
          try {
            const calClient = await getCalendarClientForUser(supabase, profile.id)
            if (calClient) {
              const res = await calClient.freebusy.query({
                requestBody: {
                  timeMin: rangeStart.toISOString(),
                  timeMax: rangeEnd.toISOString(),
                  timeZone: 'Europe/London',
                  items: [{ id: 'primary' }],
                },
              })
              busyIntervals = (res.data.calendars?.primary?.busy ?? []).map((b) => ({
                start: b.start!,
                end: b.end!,
              }))
            }
          } catch {
            // Calendar unavailable — treat all slots as free
          }
        }

        // Build available slots per date
        const availability: Record<string, string[]> = {}
        for (const date of dates) {
          const slots = generateSlots(date)
          const freeSlots = slots
            .filter((slot) => slot > now) // no past slots
            .filter((slot) => isSlotFree(slot, busyIntervals, SLOT_DURATION_MIN))
            .map((slot) =>
              slot.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/London',
              })
            )
          if (freeSlots.length > 0) {
            availability[date.toISOString().split('T')[0]] = freeSlots
          }
        }

        return {
          id: profile.id,
          name: profile.full_name,
          avatar_url: profile.avatar_url ?? null,
          color: profile.color ?? '#6366f1',
          calendar_connected: !!profile.google_calendar_connected,
          availability, // { "2025-03-15": ["09:00", "09:30", ...], ... }
        }
      })
    )

    // Only return designers who have at least one available slot
    const available = designers.filter((d) => Object.keys(d.availability).length > 0)

    return NextResponse.json({ designers: available })
  } catch (err) {
    console.error('Designers availability error:', err)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
}
