import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageChannel } from '../types'
import { DEFAULT_TEMPLATES, interpolate, getTemplateBySlug } from './templates'
import { sendEmail, sendSms, sendWhatsApp } from './channels'

interface SendMessageOptions {
  supabase: SupabaseClient
  leadId: string
  templateId: string
  channels?: MessageChannel[]
  variables: Record<string, string>
}

/**
 * Send a templated message across configured channels.
 * Logs each send attempt to message_logs.
 */
export async function sendMessage({
  supabase,
  leadId,
  templateId,
  channels,
  variables,
}: SendMessageOptions): Promise<void> {
  const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    console.error(`Template not found: ${templateId}`)
    return
  }

  // Derive first_name from name
  if (variables.name && !variables.first_name) {
    variables.first_name = variables.name.split(' ')[0]
  }

  const subject = interpolate(template.subject, variables)
  const body = interpolate(template.body, variables)
  const targetChannels = channels ?? template.channels

  // Fetch lead contact info
  const { data: lead } = await supabase
    .from('leads')
    .select('email, phone')
    .eq('id', leadId)
    .single()

  if (!lead) return

  for (const channel of targetChannels) {
    let status = 'failed'
    let metadata: Record<string, unknown> = {}

    // Pre-create the message_log so we have an ID for tracking
    const { data: logEntry } = await supabase
      .from('message_logs')
      .insert({
        lead_id: leadId,
        channel,
        template: templateId,
        status: 'sending',
        metadata: {},
      })
      .select('id')
      .single()

    const tracking = logEntry ? { messageLogId: logEntry.id, leadId } : undefined

    try {
      switch (channel) {
        case 'email': {
          if (!lead.email) break
          const result = await sendEmail(lead.email, subject, body, supabase, undefined, tracking)
          status = result.success ? 'sent' : 'failed'
          metadata = { externalId: result.externalId, error: result.error, sentVia: result.sentVia }
          break
        }
        case 'sms': {
          if (!lead.phone) break
          const result = await sendSms(lead.phone, body)
          status = result.success ? 'sent' : 'failed'
          metadata = { externalId: result.externalId, error: result.error }
          break
        }
        case 'whatsapp': {
          if (!lead.phone) break
          const result = await sendWhatsApp(lead.phone, body, templateId, variables.name)
          status = result.success ? 'sent' : 'failed'
          metadata = { externalId: result.externalId, error: result.error }
          break
        }
      }
    } catch (err: any) {
      status = 'failed'
      metadata = { error: err.message }
    }

    // Update the pre-created message_log with final status
    if (logEntry) {
      await supabase
        .from('message_logs')
        .update({ status, metadata, sent_at: new Date().toISOString() })
        .eq('id', logEntry.id)
    } else {
      await supabase.from('message_logs').insert({
        lead_id: leadId,
        channel,
        template: templateId,
        status,
        metadata,
      })
    }
  }
}

/**
 * Resolve full template variables for a queued message by looking up
 * the opportunity, booking, owner, and any related data.
 */
async function resolveTemplateVars(
  supabase: SupabaseClient,
  leadName: string,
  meta: Record<string, any>
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {
    name: leadName ?? '',
    first_name: (leadName ?? '').split(' ')[0],
    owner_name: 'PaxBespoke',
    project_type: 'wardrobe',
    booking_link: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'}/book`,
    meet_link: '',
    payment_link: '',
    amount: '',
    date: '',
    time: '',
  }

  const opportunityId = meta.opportunity_id
  if (!opportunityId) return vars

  // Get opportunity + lead details
  const { data: opp } = await supabase
    .from('opportunities')
    .select('owner_user_id, value_estimate, lead_id, stage')
    .eq('id', opportunityId)
    .single()

  if (!opp) return vars

  // Get lead project_type
  const { data: leadData } = await supabase
    .from('leads')
    .select('project_type, budget_band')
    .eq('id', opp.lead_id)
    .single()

  if (leadData?.project_type) vars.project_type = leadData.project_type

  // Get owner name
  if (opp.owner_user_id) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', opp.owner_user_id)
      .single()
    if (owner?.full_name) vars.owner_name = owner.full_name
  }

  // Get booking for date/time/meet_link
  const bookingTypeMap: Record<string, string> = {
    call1_scheduled: 'call1',
    call2_scheduled: 'call2',
    onboarding_scheduled: 'onboarding',
  }
  const triggerStage = meta.trigger_stage ?? opp.stage
  const bookingType = bookingTypeMap[triggerStage]

  if (bookingType) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('scheduled_at, meet_link')
      .eq('opportunity_id', opportunityId)
      .eq('type', bookingType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (booking?.scheduled_at) {
      const dt = new Date(booking.scheduled_at)
      vars.date = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      vars.time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
    if (booking?.meet_link) {
      vars.meet_link = booking.meet_link
    }
  }

  // Amount for deposit
  if (opp.value_estimate) {
    vars.amount = Math.round(opp.value_estimate * 0.3).toLocaleString('en-GB')
  }

  // Payment link from metadata (set by automation when Stripe session was created)
  if (meta.payment_link) {
    vars.payment_link = meta.payment_link
  }

  return vars
}

/**
 * Process all queued messages (status='queued') whose scheduled_for has passed.
 * Called by a cron job or manually from the admin panel.
 */
export async function processQueuedMessages(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString()

  const { data: queued } = await supabase
    .from('message_logs')
    .select('*, lead:leads(name, email, phone)')
    .eq('status', 'queued')
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .limit(50)

  if (!queued?.length) return 0

  let processed = 0

  for (const msg of queued) {
    const lead = msg.lead as any
    if (!lead) continue

    const meta = (msg.metadata ?? {}) as Record<string, any>

    // Resolve full template variables from opportunity/booking/owner
    const templateVars = await resolveTemplateVars(supabase, lead.name, meta)

    // Custom message (from automation) — body/subject already in metadata
    const isCustom = meta.body
    let subject: string
    let body: string

    if (isCustom) {
      // Re-interpolate in case the original had unresolved vars
      subject = interpolate(meta.subject ?? '', templateVars)
      body = interpolate(meta.body, templateVars)
    } else if (msg.template) {
      const template = await getTemplateBySlug(supabase, msg.template)
      if (!template) continue
      subject = interpolate(template.subject, templateVars)
      body = interpolate(template.body, templateVars)
    } else {
      continue
    }

    let status = 'failed'

    const tracking = msg.lead_id ? { messageLogId: msg.id, leadId: msg.lead_id } : undefined

    try {
      switch (msg.channel) {
        case 'email':
          if (lead.email) {
            const r = await sendEmail(lead.email, subject, body, supabase, undefined, tracking)
            status = r.success ? 'sent' : 'failed'
          }
          break
        case 'sms':
          if (lead.phone) {
            const r = await sendSms(lead.phone, body)
            status = r.success ? 'sent' : 'failed'
          }
          break
        case 'whatsapp':
          if (lead.phone) {
            const dateTime = templateVars.date && templateVars.time
              ? `${templateVars.date} at ${templateVars.time}`
              : undefined
            const r = await sendWhatsApp(
              lead.phone, body, msg.template ?? undefined,
              lead.name ?? undefined, dateTime
            )
            status = r.success ? 'sent' : 'failed'
          }
          break
      }
    } catch {
      status = 'failed'
    }

    const updatedMeta = {
      ...(msg.metadata as Record<string, unknown> ?? {}),
      subject,
      body,
      sent_at_actual: new Date().toISOString(),
    }

    await supabase
      .from('message_logs')
      .update({ status, sent_at: new Date().toISOString(), metadata: updatedMeta })
      .eq('id', msg.id)

    processed++
  }

  return processed
}
