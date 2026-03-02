import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runStageAutomations } from '@/lib/crm/automation'

/**
 * Quote CRUD API.
 *
 * GET   /api/crm/quotes?opportunity_id=<id>  — list quotes for an opportunity
 * POST  /api/crm/quotes                      — create a quote
 * PATCH /api/crm/quotes?id=<id>              — update quote (mark sent, accepted, etc.)
 *
 * When a quote is marked as 'sent', the opportunity advances to 'quote_sent'
 * and the automation engine sends the quote email with CTA links.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oppId = req.nextUrl.searchParams.get('opportunity_id')
  if (!oppId) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('quotes')
    .select('*, designs(version, file_url, planner_link)')
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
  const { opportunity_id, design_id, amount, deposit_amount, items, notes } = body

  if (!opportunity_id || !amount) {
    return NextResponse.json({ error: 'opportunity_id and amount required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: quote, error } = await admin
    .from('quotes')
    .insert({
      opportunity_id,
      design_id: design_id || null,
      amount,
      deposit_amount: deposit_amount ?? Math.round(amount * 0.3),
      items: items || [],
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update opportunity value_estimate
  await admin
    .from('opportunities')
    .update({ value_estimate: amount })
    .eq('id', opportunity_id)

  return NextResponse.json(quote, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json()
  const admin = createAdminClient()

  // If marking as sent, set sent_at
  if (body.status === 'sent' && !body.sent_at) {
    body.sent_at = new Date().toISOString()
  }

  const { data: quote, error } = await admin
    .from('quotes')
    .update(body)
    .eq('id', id)
    .select('*, opportunity_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If quote was just sent, advance opportunity to quote_sent
  if (body.status === 'sent' && quote.opportunity_id) {
    const { data: opp } = await admin
      .from('opportunities')
      .select('stage')
      .eq('id', quote.opportunity_id)
      .single()

    if (opp && ['design_created', 'visit_completed', 'meet2_completed'].includes(opp.stage)) {
      await admin
        .from('opportunities')
        .update({ stage: 'quote_sent' })
        .eq('id', quote.opportunity_id)

      await admin.from('stage_log').insert({
        opportunity_id: quote.opportunity_id,
        from_stage: opp.stage,
        to_stage: 'quote_sent',
        changed_by: user.id,
        notes: `Quote sent: £${Number(quote.amount).toLocaleString('en-GB')}`,
      })

      await runStageAutomations(admin, quote.opportunity_id, 'quote_sent')
    }
  }

  return NextResponse.json(quote)
}
