import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runStageAutomations } from '@/lib/crm/automation'

/**
 * Design CRUD API.
 *
 * GET  /api/crm/designs?opportunity_id=<id>  — list designs for an opportunity
 * POST /api/crm/designs                      — create a design version
 *
 * Creating a design auto-advances the opportunity to 'design_created'.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oppId = req.nextUrl.searchParams.get('opportunity_id')
  if (!oppId) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('designs')
    .select('*')
    .eq('opportunity_id', oppId)
    .order('version', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { opportunity_id, file_url, planner_link, notes } = body

  if (!opportunity_id) {
    return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get next version number
  const { count } = await admin
    .from('designs')
    .select('id', { count: 'exact', head: true })
    .eq('opportunity_id', opportunity_id)

  const version = (count ?? 0) + 1

  const { data: design, error } = await admin
    .from('designs')
    .insert({
      opportunity_id,
      version,
      file_url: file_url || null,
      planner_link: planner_link || null,
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Move opportunity to design_created (only if it's at meet1_completed or visit_completed)
  const { data: opp } = await admin
    .from('opportunities')
    .select('stage')
    .eq('id', opportunity_id)
    .single()

  if (opp && ['meet1_completed', 'visit_completed'].includes(opp.stage)) {
    await admin
      .from('opportunities')
      .update({ stage: 'design_created' })
      .eq('id', opportunity_id)

    await admin.from('stage_log').insert({
      opportunity_id,
      from_stage: opp.stage,
      to_stage: 'design_created',
      changed_by: user.id,
      notes: `Design v${version} created`,
    })

    await runStageAutomations(admin, opportunity_id, 'design_created')
  }

  return NextResponse.json(design, { status: 201 })
}
