import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runStageAutomations } from '@/lib/crm/automation'

/**
 * Fitting slot CRUD API.
 *
 * GET   /api/crm/fittings?opportunity_id=<id>  — list fitting slots for an opportunity
 * POST  /api/crm/fittings                      — propose fitting dates
 * PATCH /api/crm/fittings?id=<id>              — confirm or cancel a fitting slot
 *
 * When dates are proposed, the opportunity advances to 'fitting_proposed'.
 * When a date is confirmed (after deposit), it advances to 'fitting_confirmed'.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oppId = req.nextUrl.searchParams.get('opportunity_id')
  if (!oppId) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('fitting_slots')
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
  const { opportunity_id, proposed_dates, notes } = body

  if (!opportunity_id || !proposed_dates?.length) {
    return NextResponse.json({ error: 'opportunity_id and proposed_dates required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: slot, error } = await admin
    .from('fitting_slots')
    .insert({
      opportunity_id,
      proposed_dates,
      notes: notes || null,
      status: 'proposed',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Move opportunity to fitting_proposed
  const { data: opp } = await admin
    .from('opportunities')
    .select('stage')
    .eq('id', opportunity_id)
    .single()

  const validFromStages = ['quote_sent', 'meet2_completed', 'proposal_agreed', 'visit_completed']
  if (opp && validFromStages.includes(opp.stage)) {
    await admin
      .from('opportunities')
      .update({ stage: 'fitting_proposed' })
      .eq('id', opportunity_id)

    await admin.from('stage_log').insert({
      opportunity_id,
      from_stage: opp.stage,
      to_stage: 'fitting_proposed',
      changed_by: user.id,
      notes: `Fitting dates proposed: ${proposed_dates.length} options`,
    })

    await runStageAutomations(admin, opportunity_id, 'fitting_proposed')
  }

  return NextResponse.json(slot, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json()
  const admin = createAdminClient()

  // If confirming, set confirmed_at
  if (body.confirmed_date && !body.confirmed_at) {
    body.confirmed_at = new Date().toISOString()
    body.status = 'confirmed'
  }

  const { data: slot, error } = await admin
    .from('fitting_slots')
    .update(body)
    .eq('id', id)
    .select('*, opportunity_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If fitting was confirmed, advance opportunity
  if (body.status === 'confirmed' && slot.opportunity_id) {
    const { data: opp } = await admin
      .from('opportunities')
      .select('stage')
      .eq('id', slot.opportunity_id)
      .single()

    if (opp && opp.stage !== 'fitting_confirmed') {
      await admin
        .from('opportunities')
        .update({ stage: 'fitting_confirmed' })
        .eq('id', slot.opportunity_id)

      await admin.from('stage_log').insert({
        opportunity_id: slot.opportunity_id,
        from_stage: opp.stage,
        to_stage: 'fitting_confirmed',
        changed_by: user.id,
        notes: `Fitting confirmed for ${new Date(body.confirmed_date).toLocaleDateString('en-GB')}`,
      })

      await runStageAutomations(admin, slot.opportunity_id, 'fitting_confirmed')
    }
  }

  return NextResponse.json(slot)
}
