import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCTAToken } from '@/lib/crm/cta-tokens'

/**
 * Fitting date selection API (client-facing, no auth required — uses signed token).
 *
 * GET  /api/fitting/select?token=<token>  — returns proposed dates + client info
 * POST /api/fitting/select                — confirms a date, creates Stripe checkout
 */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const payload = verifyCTAToken(token)
  if (!payload || payload.action !== 'select-fitting') {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // Get fitting slot
  const { data: slot } = await supabase
    .from('fitting_slots')
    .select('proposed_dates, status')
    .eq('opportunity_id', payload.opportunity_id)
    .eq('status', 'proposed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!slot) {
    return NextResponse.json({ error: 'No fitting dates available' }, { status: 404 })
  }

  // Get client info
  const { data: opp } = await supabase
    .from('opportunities')
    .select('lead_id, value_estimate')
    .eq('id', payload.opportunity_id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lead } = await supabase
    .from('leads')
    .select('name')
    .eq('id', opp.lead_id)
    .single()

  const depositAmount = opp.value_estimate
    ? `£${Math.round(opp.value_estimate * 0.3).toLocaleString('en-GB')}`
    : ''

  return NextResponse.json({
    proposed_dates: slot.proposed_dates,
    opportunity_id: payload.opportunity_id,
    client_name: lead?.name ?? '',
    deposit_amount: depositAmount,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, confirmed_date } = body

  if (!token || !confirmed_date) {
    return NextResponse.json({ error: 'token and confirmed_date required' }, { status: 400 })
  }

  const payload = verifyCTAToken(token)
  if (!payload || payload.action !== 'select-fitting') {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // Update fitting slot with confirmed date (but don't fully confirm until deposit paid)
  const { data: slot } = await supabase
    .from('fitting_slots')
    .select('id')
    .eq('opportunity_id', payload.opportunity_id)
    .eq('status', 'proposed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!slot) {
    return NextResponse.json({ error: 'No fitting slot found' }, { status: 404 })
  }

  // Store the selected date (pending deposit)
  await supabase
    .from('fitting_slots')
    .update({ confirmed_date })
    .eq('id', slot.id)

  // Move to proposal_agreed
  const { data: opp } = await supabase
    .from('opportunities')
    .select('stage, lead_id, value_estimate')
    .eq('id', payload.opportunity_id)
    .single()

  if (opp && opp.stage === 'fitting_proposed') {
    await supabase
      .from('opportunities')
      .update({ stage: 'awaiting_deposit' })
      .eq('id', payload.opportunity_id)

    await supabase.from('stage_log').insert({
      opportunity_id: payload.opportunity_id,
      from_stage: 'fitting_proposed',
      to_stage: 'awaiting_deposit',
      notes: `Client selected fitting date: ${new Date(confirmed_date).toLocaleDateString('en-GB')}`,
    })

    // Trigger deposit automation
    const { runStageAutomations } = await import('@/lib/crm/automation')
    await runStageAutomations(supabase, payload.opportunity_id, 'awaiting_deposit')
  }

  // Create Stripe checkout for deposit
  if (opp?.value_estimate) {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, email')
        .eq('id', opp.lead_id)
        .single()

      const depositAmount = Math.round(opp.value_estimate * 0.3)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

      const { getStripe } = await import('@/lib/crm/stripe')
      const stripe = getStripe()

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: lead?.email ?? undefined,
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: depositAmount * 100,
            product_data: {
              name: `PaxBespoke Deposit — ${lead?.name ?? 'Project'}`,
              description: `Deposit for fitting on ${new Date(confirmed_date).toLocaleDateString('en-GB')}`,
            },
          },
          quantity: 1,
        }],
        metadata: { opportunity_id: payload.opportunity_id, fitting_date: confirmed_date },
        success_url: `${baseUrl}/action/payment-success`,
        cancel_url: `${baseUrl}/fitting/select?token=${token}`,
      })

      return NextResponse.json({ payment_url: session.url })
    } catch (err) {
      console.error('Stripe checkout error:', err)
    }
  }

  return NextResponse.json({ confirmed: true })
}
