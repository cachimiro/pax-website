import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runStageAutomations } from '@/lib/crm/automation'

/**
 * Visit CRUD API.
 *
 * GET  /api/crm/visits?opportunity_id=<id>  — list visits for an opportunity
 * POST /api/crm/visits                      — create a visit + sync to Google Calendar
 * PATCH /api/crm/visits?id=<id>             — update visit (complete, cancel, reschedule)
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oppId = req.nextUrl.searchParams.get('opportunity_id')
  if (!oppId) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('opportunity_id', oppId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { opportunity_id, scheduled_at, address, notes } = body

  if (!opportunity_id || !scheduled_at) {
    return NextResponse.json({ error: 'opportunity_id and scheduled_at required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create visit record
  const { data: visit, error } = await admin
    .from('visits')
    .insert({
      opportunity_id,
      scheduled_at,
      address: address || null,
      notes: notes || null,
      outcome: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync to Google Calendar
  try {
    const { data: lead } = await admin
      .from('leads')
      .select('name, email')
      .eq('id', (await admin.from('opportunities').select('lead_id').eq('id', opportunity_id).single()).data?.lead_id ?? '')
      .single()

    const { syncBookingToCalendar } = await import('@/lib/crm/calendar')
    await syncBookingToCalendar(admin, {
      id: visit.id,
      type: 'visit',
      scheduled_at,
      duration_min: 60,
      opportunity_id,
    }, lead?.name ?? 'Client', lead?.email ?? undefined)
  } catch (err) {
    console.error('Visit calendar sync error:', err)
  }

  // Move opportunity to visit_scheduled
  await admin
    .from('opportunities')
    .update({ stage: 'visit_scheduled' })
    .eq('id', opportunity_id)

  await admin.from('stage_log').insert({
    opportunity_id,
    to_stage: 'visit_scheduled',
    changed_by: user.id,
    notes: `Visit scheduled for ${new Date(scheduled_at).toLocaleDateString('en-GB')}`,
  })

  await runStageAutomations(admin, opportunity_id, 'visit_scheduled')

  return NextResponse.json(visit, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json()
  const admin = createAdminClient()

  const { data: visit, error } = await admin
    .from('visits')
    .update(body)
    .eq('id', id)
    .select('*, opportunity_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If visit was completed, move opportunity to visit_completed
  if (body.outcome === 'completed' && visit.opportunity_id) {
    await admin
      .from('opportunities')
      .update({ stage: 'visit_completed' })
      .eq('id', visit.opportunity_id)

    await admin.from('stage_log').insert({
      opportunity_id: visit.opportunity_id,
      to_stage: 'visit_completed',
      changed_by: user.id,
      notes: 'Visit completed',
    })

    await runStageAutomations(admin, visit.opportunity_id, 'visit_completed')
  }

  return NextResponse.json(visit)
}
