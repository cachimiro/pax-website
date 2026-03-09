import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runStageAutomations } from '@/lib/crm/automation'

/**
 * POST /api/crm/quotes/agree
 *
 * Called from the public /quote/[token] page when the customer agrees.
 * - Validates the token
 * - Records accepted_at, accepted_ip, accepted_name on the quote
 * - Marks quote status = 'accepted'
 * - Advances opportunity to 'awaiting_deposit'
 * - Triggers automation (creates QBO invoice, sends deposit request email)
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, confirm_name } = body

  if (!token || !confirm_name?.trim()) {
    return NextResponse.json({ error: 'token and confirm_name required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Validate token
  const { data: tokenRow } = await admin
    .from('quote_tokens')
    .select('id, quote_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 })
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This quote link has expired. Please contact us for a new one.' }, { status: 410 })
  }

  // Load quote
  const { data: quote } = await admin
    .from('quotes')
    .select('id, status, amount, deposit_amount, opportunity_id')
    .eq('id', tokenRow.quote_id)
    .single()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
  }

  // Already accepted — idempotent
  if (quote.status === 'accepted') {
    return NextResponse.json({ accepted: true, already: true })
  }

  // Get client IP for audit trail
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const now = new Date().toISOString()

  // Mark quote accepted
  await admin
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: now,
      accepted_ip: ip,
      accepted_name: confirm_name.trim(),
    })
    .eq('id', quote.id)

  // Mark token used
  await admin
    .from('quote_tokens')
    .update({ used_at: now })
    .eq('id', tokenRow.id)

  // Load current opportunity stage
  const { data: opp } = await admin
    .from('opportunities')
    .select('stage, leads(id, name)')
    .eq('id', quote.opportunity_id)
    .single()

  if (!opp) {
    return NextResponse.json({ error: 'Opportunity not found.' }, { status: 404 })
  }

  // Advance to awaiting_deposit (if not already past that stage)
  const pastStages = ['awaiting_deposit', 'deposit_paid', 'onboarding', 'fitting_confirmed', 'fitting_in_progress', 'completed']
  if (!pastStages.includes(opp.stage)) {
    await admin
      .from('opportunities')
      .update({ stage: 'awaiting_deposit' })
      .eq('id', quote.opportunity_id)

    await admin.from('stage_log').insert({
      opportunity_id: quote.opportunity_id,
      from_stage: opp.stage,
      to_stage: 'awaiting_deposit',
      notes: `Customer agreed to quote: £${Number(quote.amount).toLocaleString('en-GB')} — signed as "${confirm_name.trim()}"`,
    })

    // Trigger automations: creates QBO invoice + sends deposit request email
    runStageAutomations(
      admin,
      quote.opportunity_id,
      'awaiting_deposit'
    ).catch((err) => console.error('[agree] runStageAutomations error:', err))
  }

  return NextResponse.json({ accepted: true })
}
