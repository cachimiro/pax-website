import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** GET — fetch fitter's weekly schedule and blocked dates */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: sub } = await admin
      .from('subcontractors')
      .select('id, travel_radius_miles, service_areas, available_for_jobs')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    const [{ data: schedule }, { data: blocked }] = await Promise.all([
      admin
        .from('fitter_availability')
        .select('*')
        .eq('subcontractor_id', sub.id)
        .order('day_of_week'),
      admin
        .from('fitter_blocked_dates')
        .select('*')
        .eq('subcontractor_id', sub.id)
        .gte('blocked_date', new Date().toISOString().slice(0, 10))
        .order('blocked_date'),
    ])

    return NextResponse.json({
      schedule: schedule || [],
      blocked_dates: blocked || [],
      settings: {
        travel_radius_miles: sub.travel_radius_miles,
        service_areas: sub.service_areas,
        available_for_jobs: sub.available_for_jobs,
      },
    })
  } catch (err: unknown) {
    console.error('Availability GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}

/** PUT — update weekly schedule */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    const body = await req.json()
    const { schedule, settings } = body

    // Update weekly schedule (upsert all 7 days)
    if (schedule && Array.isArray(schedule)) {
      for (const day of schedule) {
        await admin
          .from('fitter_availability')
          .upsert({
            subcontractor_id: sub.id,
            day_of_week: day.day_of_week,
            is_available: day.is_available ?? true,
            start_time: day.start_time || '08:00',
            end_time: day.end_time || '17:00',
            max_jobs_per_day: day.max_jobs_per_day ?? 2,
          }, { onConflict: 'subcontractor_id,day_of_week' })
      }
    }

    // Update settings
    if (settings) {
      const updates: Record<string, unknown> = {}
      if (settings.travel_radius_miles !== undefined) updates.travel_radius_miles = settings.travel_radius_miles
      if (settings.service_areas !== undefined) updates.service_areas = settings.service_areas
      if (settings.available_for_jobs !== undefined) updates.available_for_jobs = settings.available_for_jobs

      if (Object.keys(updates).length > 0) {
        await admin.from('subcontractors').update(updates).eq('id', sub.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Availability PUT error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update availability' },
      { status: 500 }
    )
  }
}

/** POST — add a blocked date */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    const { blocked_date, reason } = await req.json()
    if (!blocked_date) {
      return NextResponse.json({ error: 'blocked_date required' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('fitter_blocked_dates')
      .insert({
        subcontractor_id: sub.id,
        blocked_date,
        reason: reason || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ blocked_date: data })
  } catch (err: unknown) {
    console.error('Blocked date POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add blocked date' },
      { status: 500 }
    )
  }
}

/** DELETE — remove a blocked date */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await admin
      .from('fitter_blocked_dates')
      .delete()
      .eq('id', id)
      .eq('subcontractor_id', sub.id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Blocked date DELETE error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remove blocked date' },
      { status: 500 }
    )
  }
}
