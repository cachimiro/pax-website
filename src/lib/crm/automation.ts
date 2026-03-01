import type { SupabaseClient } from '@supabase/supabase-js'
import type { OpportunityStage, MessageChannel } from './types'
import { getTemplatesForStage, interpolate } from './messaging/templates'

/**
 * Operational tasks to create on stage transitions.
 * Messaging is handled separately by DB-driven templates.
 */
const stageTasks: Partial<Record<OpportunityStage, { type: string; description: (name: string) => string }>> = {
  new_enquiry: { type: 'call1_attempt', description: (n) => `First call attempt for ${n}` },
  qualified: { type: 'schedule_call2', description: (n) => `Schedule Call 2 with ${n}` },
  deposit_paid: { type: 'schedule_onboarding', description: (n) => `Schedule onboarding for ${n}` },
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
    .select('lead_id, owner_user_id, value_estimate')
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
      await supabase.from('tasks').insert({
        opportunity_id: opportunityId,
        type: taskDef.type,
        due_at: new Date().toISOString(),
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
      .single()
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
      .single()

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

  const variables: Record<string, string> = {
    name: lead.name ?? '',
    first_name: (lead.name ?? '').split(' ')[0],
    owner_name: ownerName,
    project_type: lead.project_type ?? 'wardrobe',
    amount: opp.value_estimate ? Math.round(opp.value_estimate * 0.3).toLocaleString('en-GB') : '',
    booking_link: bookingLink,
    meet_link: meetLink ?? '',
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
      .single()

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
        .single()

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
