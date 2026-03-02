import type { SupabaseClient } from '@supabase/supabase-js'
import type { OpportunityStage, MessageChannel } from './types'
import { getTemplatesForStage, interpolate } from './messaging/templates'
import { generateAllCTAUrls } from './cta-tokens'

/**
 * Operational tasks auto-created on stage transitions.
 * Each entry maps a stage to a task for the deal owner.
 */
const stageTasks: Partial<Record<OpportunityStage, { type: string; description: (name: string) => string }>> = {
  new_enquiry:       { type: 'call1_attempt',    description: (n) => `First call attempt for ${n}` },
  meet1_completed:   { type: 'create_design',    description: (n) => `Create 3D design for ${n}` },
  design_created:    { type: 'send_quote',        description: (n) => `Send quote to ${n}` },
  visit_required:    { type: 'schedule_visit',    description: (n) => `Schedule site visit for ${n}` },
  visit_completed:   { type: 'revise_design',     description: (n) => `Revise design after visit for ${n}` },
  meet2_completed:   { type: 'update_quote',      description: (n) => `Update quote after Meet 2 for ${n}` },
  deposit_paid:      { type: 'confirm_fitting',   description: (n) => `Confirm fitting slot for ${n}` },
  fitting_confirmed: { type: 'prepare_materials', description: (n) => `Prepare materials for ${n}` },
  on_hold:           { type: 'nurture_checkin',    description: (n) => `Nurture check-in for ${n} (2 weeks)` },
}

/**
 * Run all automation actions for a stage transition.
 * Reads active templates from the DB for the given stage,
 * queues messages on all configured channels with proper scheduling.
 */
export async function runStageAutomations(
  supabase: SupabaseClient,
  opportunityId: string,
  stage: OpportunityStage,
  bookingTime?: Date,
  meetLink?: string
): Promise<void> {
  // Fetch context
  const { data: opp } = await supabase
    .from('opportunities')
    .select('lead_id, owner_user_id, value_estimate, entry_route, package_complexity, visit_required')
    .eq('id', opportunityId)
    .single()

  if (!opp) return

  const { data: lead } = await supabase
    .from('leads')
    .select('name, email, phone, project_type, budget_band')
    .eq('id', opp.lead_id)
    .single()

  if (!lead) return

  // Create operational task if defined for this stage
  const taskDef = stageTasks[stage]
  if (taskDef) {
    try {
      const dueAt = stage === 'on_hold'
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : new Date().toISOString()

      await supabase.from('tasks').insert({
        opportunity_id: opportunityId,
        type: taskDef.type,
        due_at: dueAt,
        owner_user_id: opp.owner_user_id,
        status: 'open',
        description: taskDef.description(lead.name ?? 'Unknown'),
      })
    } catch (err) {
      console.error(`Task creation error for stage ${stage}:`, err)
    }
  }

  // Get owner name
  let ownerName = 'PaxBespoke'
  if (opp.owner_user_id) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', opp.owner_user_id)
      .maybeSingle()
    if (owner?.full_name) ownerName = owner.full_name
  }

  // Get booking info for reminder scheduling
  const bookingTypeMap: Record<string, string> = {
    call1_scheduled: 'call1',
    call2_scheduled: 'call2',
    onboarding_scheduled: 'onboarding',
  }
  const bookingType = bookingTypeMap[stage]

  if (!bookingTime && bookingType) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('scheduled_at, meet_link')
      .eq('opportunity_id', opportunityId)
      .eq('type', bookingType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (booking?.scheduled_at) {
      bookingTime = new Date(booking.scheduled_at)
    }
    if (booking?.meet_link && !meetLink) {
      meetLink = booking.meet_link
    }
  }

  // Build template variables
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

  // Generate pre-filled booking link based on stage
  const bookingTypeForStage: Record<string, string> = {
    qualified: 'call2',
    deposit_paid: 'onboarding',
  }
  const prefillType = bookingTypeForStage[stage]
  let bookingLink = `${baseUrl}/book`
  if (prefillType) {
    const params = new URLSearchParams({
      type: prefillType,
      opp: opportunityId,
      name: lead.name ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
    })
    bookingLink = `${baseUrl}/book?${params.toString()}`
  }

  // Get latest quote info
  let quoteAmount = ''
  let depositAmountStr = ''
  let designLink = ''
  const { data: latestQuote } = await supabase
    .from('quotes')
    .select('amount, deposit_amount, design_id')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestQuote) {
    quoteAmount = `£${Number(latestQuote.amount).toLocaleString('en-GB')}`
    depositAmountStr = latestQuote.deposit_amount
      ? `£${Number(latestQuote.deposit_amount).toLocaleString('en-GB')}`
      : opp.value_estimate
        ? `£${Math.round(opp.value_estimate * 0.3).toLocaleString('en-GB')}`
        : ''
    if (latestQuote.design_id) {
      const { data: design } = await supabase
        .from('designs')
        .select('file_url, planner_link')
        .eq('id', latestQuote.design_id)
        .maybeSingle()
      designLink = design?.file_url || design?.planner_link || ''
    }
  }

  // Get fitting dates
  let fittingDates = ''
  let confirmedFittingDate = ''
  const { data: fitting } = await supabase
    .from('fitting_slots')
    .select('proposed_dates, confirmed_date')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fitting) {
    if (fitting.proposed_dates && Array.isArray(fitting.proposed_dates)) {
      fittingDates = (fitting.proposed_dates as string[])
        .map((d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))
        .join(', ')
    }
    if (fitting.confirmed_date) {
      confirmedFittingDate = new Date(fitting.confirmed_date).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    }
  }

  // Get visit info
  let visitDate = ''
  let visitTime = ''
  if (stage === 'visit_scheduled' || stage === 'visit_completed') {
    const { data: visit } = await supabase
      .from('visits')
      .select('scheduled_at')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (visit?.scheduled_at) {
      const vt = new Date(visit.scheduled_at)
      visitDate = vt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      visitTime = vt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
  }

  // Generate CTA URLs for email action links
  const ctaUrls = generateAllCTAUrls(opportunityId)

  const variables: Record<string, string> = {
    name: lead.name ?? '',
    first_name: (lead.name ?? '').split(' ')[0],
    owner_name: ownerName,
    project_type: lead.project_type ?? 'wardrobe',
    amount: opp.value_estimate ? Math.round(opp.value_estimate * 0.3).toLocaleString('en-GB') : '',
    booking_link: bookingLink,
    meet_link: meetLink ?? '',
    // Sales process variables
    quote_amount: quoteAmount,
    deposit_amount: depositAmountStr,
    design_link: designLink,
    fitting_dates: fittingDates,
    confirmed_fitting_date: confirmedFittingDate,
    visit_date: visitDate,
    visit_time: visitTime,
    entry_route: opp.entry_route ?? '',
    package_type: opp.package_complexity ?? '',
    // CTA URLs
    ...ctaUrls,
  }

  if (bookingTime) {
    variables.date = bookingTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    variables.time = bookingTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  // Auto-create invoice + payment link for awaiting_deposit
  if (stage === 'awaiting_deposit' && opp.value_estimate) {
    const depositAmount = Math.round(opp.value_estimate * 0.3)
    variables.amount = depositAmount.toLocaleString('en-GB')

    // Check if invoice already exists
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('opportunity_id', opportunityId)
      .limit(1)
      .maybeSingle()

    let invoiceId = existingInvoice?.id

    if (!invoiceId) {
      const { data: newInvoice } = await supabase
        .from('invoices')
        .insert({
          opportunity_id: opportunityId,
          amount: opp.value_estimate,
          deposit_amount: depositAmount,
          status: 'sent',
        })
        .select('id')
        .maybeSingle()

      invoiceId = newInvoice?.id
    }

    // Generate Stripe checkout URL
    if (invoiceId) {
      try {
        const { getStripe } = await import('./stripe')
        const stripe = getStripe()
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          customer_email: lead.email ?? undefined,
          line_items: [{
            price_data: {
              currency: 'gbp',
              unit_amount: depositAmount * 100,
              product_data: {
                name: `PaxBespoke Deposit — ${lead.name ?? 'Project'}`,
                description: 'Deposit payment for your bespoke wardrobe project',
              },
            },
            quantity: 1,
          }],
          metadata: { invoice_id: invoiceId, opportunity_id: opportunityId },
          success_url: `${baseUrl}/crm/onboarding/${opportunityId}?payment=success`,
          cancel_url: `${baseUrl}/crm/onboarding/${opportunityId}?payment=cancelled`,
        })

        if (session.url) {
          variables.payment_link = session.url
        }

        await supabase
          .from('invoices')
          .update({ stripe_session_id: session.id })
          .eq('id', invoiceId)
      } catch (err) {
        console.error('Stripe checkout creation error:', err)
        variables.payment_link = '[Payment link unavailable — contact us]'
      }
    }
  }

  // Fetch all active templates for this stage from DB
  const templates = await getTemplatesForStage(supabase, stage)
  const now = new Date()

  // Duplicate prevention: check what was already queued/sent for this opportunity + stage
  const { data: existingLogs } = await supabase
    .from('message_logs')
    .select('template, channel')
    .eq('lead_id', opp.lead_id)
    .in('status', ['queued', 'sent', 'sending'])
    .not('metadata->trigger_stage', 'is', null)
    .eq('metadata->>trigger_stage', stage)
    .eq('metadata->>opportunity_id', opportunityId)

  const alreadySent = new Set(
    (existingLogs ?? []).map((l) => `${l.template}:${l.channel}`)
  )

  for (const tmpl of templates) {
    // Compute scheduled_for based on delay rule
    let scheduledFor: string | null = null

    switch (tmpl.delay_rule) {
      case 'immediate':
        scheduledFor = null
        break
      case 'minutes_before_booking':
        if (bookingTime) {
          const sendAt = new Date(bookingTime.getTime() - tmpl.delay_minutes * 60 * 1000)
          if (sendAt > now) {
            scheduledFor = sendAt.toISOString()
          } else {
            continue // too late to send
          }
        } else {
          continue // no booking
        }
        break
      case 'minutes_after_stage':
        if (tmpl.delay_minutes > 0) {
          scheduledFor = new Date(now.getTime() + tmpl.delay_minutes * 60 * 1000).toISOString()
        }
        break
      case 'minutes_after_enquiry':
        if (tmpl.delay_minutes > 0) {
          scheduledFor = new Date(now.getTime() + tmpl.delay_minutes * 60 * 1000).toISOString()
        }
        break
    }

    const subject = interpolate(tmpl.subject, variables)
    const body = interpolate(tmpl.body, variables)

    // Queue one message per channel (skip duplicates)
    for (const channel of tmpl.channels as MessageChannel[]) {
      if (channel === 'email' && !lead.email) continue
      if ((channel === 'sms' || channel === 'whatsapp') && !lead.phone) continue
      if (alreadySent.has(`${tmpl.slug}:${channel}`)) {
        console.log(`[AUTOMATION] Skipping duplicate: ${tmpl.slug}/${channel} for lead ${opp.lead_id}`)
        continue
      }

      try {
        await supabase.from('message_logs').insert({
          lead_id: opp.lead_id,
          channel,
          template: tmpl.slug,
          status: 'queued',
          scheduled_for: scheduledFor,
          metadata: {
            subject,
            body,
            auto_triggered: true,
            trigger_stage: stage,
            opportunity_id: opportunityId,
          },
        })
      } catch (err) {
        console.error(`Automation queue error for ${tmpl.slug}/${channel}:`, err)
      }
    }
  }
}

/**
 * Cancel all queued messages for a lead/opportunity.
 * Called when a client clicks "Not Interested" or "Need More Time".
 */
export async function cancelQueuedMessages(
  supabase: SupabaseClient,
  leadId: string,
  opportunityId?: string
): Promise<number> {
  let query = supabase
    .from('message_logs')
    .update({ status: 'cancelled' })
    .eq('lead_id', leadId)
    .eq('status', 'queued')

  if (opportunityId) {
    query = query.eq('metadata->>opportunity_id', opportunityId)
  }

  const { count } = await query

  return count ?? 0
}
