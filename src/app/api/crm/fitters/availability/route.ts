import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/crm/fitters/availability?date=2025-03-15
 * Returns availability of all active fitters for a given date.
 * Checks weekly schedule, blocked dates, and existing job count.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dateStr = req.nextUrl.searchParams.get('date')
    if (!dateStr) {
      return NextResponse.json({ error: 'date parameter required (YYYY-MM-DD)' }, { status: 400 })
    }

    const targetDate = new Date(dateStr + 'T00:00:00')
    // JS getDay: 0=Sun, we need 0=Mon
    const jsDay = targetDate.getDay()
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1

    const admin = createAdminClient()

    // Get all active fitters
    const { data: fitters } = await admin
      .from('subcontractors')
      .select('id, name, email, phone, available_for_jobs, travel_radius_miles, service_areas, avg_rating, total_jobs_completed, decline_rate')
      .eq('status', 'active')

    if (!fitters || fitters.length === 0) {
      return NextResponse.json({ fitters: [] })
    }

    const fitterIds = fitters.map(f => f.id)

    // Get weekly schedules for this day
    const { data: schedules } = await admin
      .from('fitter_availability')
      .select('subcontractor_id, is_available, start_time, end_time, max_jobs_per_day')
      .in('subcontractor_id', fitterIds)
      .eq('day_of_week', dayOfWeek)

    // Get blocked dates
    const { data: blocked } = await admin
      .from('fitter_blocked_dates')
      .select('subcontractor_id')
      .in('subcontractor_id', fitterIds)
      .eq('blocked_date', dateStr)

    // Count existing jobs on this date
    const startOfDay = dateStr + 'T00:00:00'
    const endOfDay = dateStr + 'T23:59:59'
    const { data: existingJobs } = await admin
      .from('fitting_jobs')
      .select('subcontractor_id')
      .in('subcontractor_id', fitterIds)
      .gte('scheduled_date', startOfDay)
      .lte('scheduled_date', endOfDay)
      .not('status', 'in', '("cancelled","declined")')

    const blockedSet = new Set((blocked || []).map(b => b.subcontractor_id))
    const scheduleMap = new Map((schedules || []).map(s => [s.subcontractor_id, s]))
    const jobCounts = new Map<string, number>()
    for (const j of existingJobs || []) {
      jobCounts.set(j.subcontractor_id, (jobCounts.get(j.subcontractor_id) || 0) + 1)
    }

    const result = fitters.map(f => {
      const sched = scheduleMap.get(f.id)
      const isBlocked = blockedSet.has(f.id)
      const currentJobs = jobCounts.get(f.id) || 0
      const maxJobs = sched?.max_jobs_per_day ?? 2
      const isScheduled = sched ? sched.is_available : dayOfWeek < 5 // default Mon-Fri

      let status: 'available' | 'busy' | 'blocked' | 'off' | 'unavailable'
      if (!f.available_for_jobs) status = 'unavailable'
      else if (isBlocked) status = 'blocked'
      else if (!isScheduled) status = 'off'
      else if (currentJobs >= maxJobs) status = 'busy'
      else status = 'available'

      return {
        id: f.id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        status,
        current_jobs: currentJobs,
        max_jobs: maxJobs,
        start_time: sched?.start_time || '08:00',
        end_time: sched?.end_time || '17:00',
        travel_radius_miles: f.travel_radius_miles,
        service_areas: f.service_areas,
        avg_rating: f.avg_rating,
        total_jobs_completed: f.total_jobs_completed,
        decline_rate: f.decline_rate,
      }
    })

    // Sort: available first, then by rating
    result.sort((a, b) => {
      const order = { available: 0, busy: 1, off: 2, blocked: 3, unavailable: 4 }
      const diff = order[a.status] - order[b.status]
      if (diff !== 0) return diff
      return (b.avg_rating || 0) - (a.avg_rating || 0)
    })

    return NextResponse.json({ fitters: result, date: dateStr, day: dayOfWeek })
  } catch (err: unknown) {
    console.error('CRM availability error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}
