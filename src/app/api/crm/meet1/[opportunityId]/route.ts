import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ opportunityId: string }> }

// ─── GET: fetch existing meet1_notes for an opportunity ──────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { opportunityId } = await params
  const admin = createAdminClient()

  const { data: notes } = await admin
    .from('meet1_notes')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .maybeSingle()

  // Also fetch lead context to pre-fill suggestions
  const { data: opp } = await admin
    .from('opportunities')
    .select('lead_id, package_complexity, entry_route')
    .eq('id', opportunityId)
    .single()

  let lead = null
  if (opp?.lead_id) {
    const { data } = await admin
      .from('leads')
      .select('name, project_type, space_constraints, measurements, planner_link, home_visit')
      .eq('id', opp.lead_id)
      .single()
    lead = data
  }

  return NextResponse.json({ notes: notes ?? null, lead, opp })
}

// ─── PATCH: upsert meet1_notes (auto-save) ───────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { opportunityId } = await params
  const admin = createAdminClient()
  const body = await req.json()

  // Resolve lead_id from opportunity
  const { data: opp } = await admin
    .from('opportunities')
    .select('lead_id')
    .eq('id', opportunityId)
    .single()

  const { data: existing } = await admin
    .from('meet1_notes')
    .select('id')
    .eq('opportunity_id', opportunityId)
    .maybeSingle()

  const payload = {
    ...body,
    opportunity_id: opportunityId,
    lead_id: opp?.lead_id ?? null,
    updated_at: new Date().toISOString(),
  }

  let result
  if (existing) {
    const { data, error } = await admin
      .from('meet1_notes')
      .update(payload)
      .eq('opportunity_id', opportunityId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await admin
      .from('meet1_notes')
      .insert({ ...payload, created_by: user.id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  // Mirror confirmed package back to opportunity.package_complexity
  if (body.package_confirmed) {
    const complexityMap: Record<string, string> = {
      budget: 'budget',
      paxbespoke: 'standard',
      select: 'select',
    }
    const complexity = complexityMap[body.package_confirmed]
    if (complexity) {
      await admin
        .from('opportunities')
        .update({ package_complexity: complexity })
        .eq('id', opportunityId)
    }
  }

  // Mirror space_constraints back to lead
  if (body.space_constraints && opp?.lead_id) {
    await admin
      .from('leads')
      .update({ space_constraints: body.space_constraints })
      .eq('id', opp.lead_id)
  }

  return NextResponse.json({ notes: result })
}
