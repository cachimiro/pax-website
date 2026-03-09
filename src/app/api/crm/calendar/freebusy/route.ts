import { NextRequest, NextResponse } from 'next/server'
import { queryFreeBusy } from '@/lib/crm/calendar'
import { getCalendarClientForUser } from '@/lib/crm/google'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/crm/calendar/freebusy?timeMin=...&timeMax=...
 *
 * Returns merged busy intervals across ALL active designers' Google Calendars.
 * Falls back to the shared google_config calendar if no per-user calendars connected.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const timeMin = searchParams.get('timeMin')
  const timeMax = searchParams.get('timeMax')

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: 'timeMin and timeMax required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch all active users with Google Calendar connected
    const { data: designers } = await supabase
      .from('profiles')
      .select('id, full_name, color, google_calendar_connected')
      .eq('active', true)
      .eq('google_calendar_connected', true)
      .in('role', ['admin', 'sales', 'operations'])

    // Fall back to shared google_config if no per-user calendars
    if (!designers || designers.length === 0) {
      const busy = await queryFreeBusy(supabase, timeMin, timeMax)
      return NextResponse.json({ busy, merged: true, fallback: true })
    }

    // Query each designer's calendar in parallel
    const results = await Promise.allSettled(
      designers.map(async (designer) => {
        const calClient = await getCalendarClientForUser(supabase, designer.id)
        if (!calClient) return { designerId: designer.id, busy: [] }

        const res = await calClient.freebusy.query({
          requestBody: {
            timeMin,
            timeMax,
            timeZone: 'Europe/London',
            items: [{ id: 'primary' }],
          },
        })

        const busy = (res.data.calendars?.primary?.busy ?? []).map((b) => ({
          start: b.start!,
          end: b.end!,
        }))

        return { designerId: designer.id, busy }
      })
    )

    // Build per-designer busy map
    const perDesigner: Record<string, { start: string; end: string }[]> = {}
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        perDesigner[result.value.designerId] = result.value.busy
      } else {
        perDesigner[designers[i].id] = []
      }
    })

    // Union of all busy intervals — slot is unavailable only if ALL designers are busy
    // We return the raw per-designer data; booking API resolves who is free at a given slot
    const allBusy = Object.values(perDesigner).flat()

    return NextResponse.json({
      busy: allBusy,
      perDesigner,
      designers: designers.map((d) => ({ id: d.id, name: d.full_name, color: d.color })),
      merged: true,
      fallback: false,
    })
  } catch (err) {
    console.error('FreeBusy query error:', err)
    return NextResponse.json({ busy: [] })
  }
}
