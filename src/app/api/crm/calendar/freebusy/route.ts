import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryFreeBusy } from '@/lib/crm/calendar'

/**
 * GET /api/crm/calendar/freebusy?timeMin=...&timeMax=...
 * Returns busy intervals for the connected Google Calendar.
 * Used by the public booking form to show available slots.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const timeMin = searchParams.get('timeMin')
  const timeMax = searchParams.get('timeMax')

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: 'timeMin and timeMax required' }, { status: 400 })
  }

  try {
    // Use admin client so public booking page can query availability
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const busy = await queryFreeBusy(supabase, timeMin, timeMax)
    return NextResponse.json({ busy })
  } catch (err) {
    console.error('FreeBusy query error:', err)
    return NextResponse.json({ busy: [] })
  }
}
