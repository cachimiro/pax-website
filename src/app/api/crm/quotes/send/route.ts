import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runStageAutomations } from '@/lib/crm/automation'
import { generateQuoteToken, buildQuoteUrl } from '@/lib/crm/cta-tokens'
import { sendEmail } from '@/lib/crm/messaging/channels'

/**
 * POST /api/crm/quotes/send
 *
 * Sends the quote to the customer for agreement.
 * - Saves/updates the quote as 'sent'
 * - Generates a secure quote_token for the /quote/[token] page
 * - Sends the quote email with a "Review & agree" button
 * - Advances opportunity to 'quote_sent'
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { quote_id, opportunity_id } = body

  if (!quote_id && !opportunity_id) {
    return NextResponse.json({ error: 'quote_id or opportunity_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Resolve quote
  let resolvedQuoteId = quote_id
  if (!resolvedQuoteId) {
    const { data: latestQuote } = await admin
      .from('quotes')
      .select('id')
      .eq('opportunity_id', opportunity_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    resolvedQuoteId = latestQuote?.id
  }

  if (!resolvedQuoteId) {
    return NextResponse.json({ error: 'No quote found. Save the quote first.' }, { status: 404 })
  }

  // Load quote + opportunity + lead
  const { data: quote, error: quoteErr } = await admin
    .from('quotes')
    .select('*, opportunities(id, stage, package_complexity, value_estimate, leads(id, name, email, phone, postcode, project_type, style, budget_band, timeline, space_constraints))')
    .eq('id', resolvedQuoteId)
    .single()

  if (quoteErr || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  const opp = quote.opportunities as Record<string, unknown>
  const lead = opp?.leads as Record<string, unknown>

  if (!lead?.email) {
    return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 })
  }

  // Generate secure token for the agreement page
  const token = await generateQuoteToken(admin, resolvedQuoteId)
  if (!token) {
    return NextResponse.json({ error: 'Failed to generate quote token' }, { status: 500 })
  }

  const quoteUrl = buildQuoteUrl(token)

  // Mark quote as sent
  await admin
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', resolvedQuoteId)

  // Advance opportunity to quote_sent
  const oppId = opp.id as string
  const currentStage = opp.stage as string

  if (!['quote_sent', 'awaiting_deposit', 'deposit_paid'].includes(currentStage)) {
    await admin
      .from('opportunities')
      .update({ stage: 'quote_sent' })
      .eq('id', oppId)

    await admin.from('stage_log').insert({
      opportunity_id: oppId,
      from_stage: currentStage,
      to_stage: 'quote_sent',
      changed_by: user.id,
      notes: `Quote sent: £${Number(quote.amount).toLocaleString('en-GB')}`,
    })
  }

  // Load sender profile
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle()

  const firstName = (lead.name as string).split(' ')[0]
  const packageLabel = {
    budget: 'Budget Package',
    paxbespoke: 'PaxBespoke Package',
    select: 'Select Package',
  }[opp.package_complexity as string] ?? 'Bespoke Wardrobe'

  const depositAmount = quote.deposit_amount ?? Math.round(Number(quote.amount) * 0.3)

  // Send quote email
  await sendEmail(
    lead.email as string,
    `Your PaxBespoke quote is ready — £${Number(quote.amount).toLocaleString('en-GB')}`,
    `Hi ${firstName},

Your quote for your ${packageLabel} is ready to review.

Here's a summary of what we discussed:
• Project: ${lead.project_type ?? 'Wardrobe'} — ${lead.postcode ?? ''}
• Package: ${packageLabel}
• Total: £${Number(quote.amount).toLocaleString('en-GB')}
• Deposit to secure your slot: £${depositAmount.toLocaleString('en-GB')} (${Math.round((depositAmount / Number(quote.amount)) * 100)}%)
• Balance: £${(Number(quote.amount) - depositAmount).toLocaleString('en-GB')} — due on completion

Please review the full quote and agree to proceed. Once you agree, we'll send your deposit invoice.

[CTA:Review & agree to quote|${quoteUrl}]

The quote link is valid for 30 days. If you have any questions, just reply to this email.

${profile?.full_name ?? 'The PaxBespoke team'}`,
    supabase,
    {
      name: profile?.full_name ?? 'PaxBespoke',
      email: profile?.email,
      phone: profile?.phone,
    }
  )

  // Log the message
  await admin.from('message_log').insert({
    lead_id: lead.id as string,
    opportunity_id: oppId,
    channel: 'email',
    direction: 'outbound',
    subject: `Quote sent: £${Number(quote.amount).toLocaleString('en-GB')}`,
    body: `Quote agreement link sent to ${lead.email}`,
    status: 'sent',
    sent_by: user.id,
  })

  return NextResponse.json({ sent: true, quote_url: quoteUrl })
}
