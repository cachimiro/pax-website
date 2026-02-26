import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageChannel } from '../types'
import { DEFAULT_TEMPLATES, interpolate } from './templates'
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

    try {
      switch (channel) {
        case 'email': {
          if (!lead.email) break
          const result = await sendEmail(lead.email, subject, body)
          status = result.success ? 'sent' : 'failed'
          metadata = { externalId: result.externalId, error: result.error }
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
          const result = await sendWhatsApp(lead.phone, body)
          status = result.success ? 'sent' : 'failed'
          metadata = { externalId: result.externalId, error: result.error }
          break
        }
      }
    } catch (err: any) {
      status = 'failed'
      metadata = { error: err.message }
    }

    // Log to message_logs
    await supabase.from('message_logs').insert({
      lead_id: leadId,
      channel,
      template: templateId,
      status,
      metadata,
    })
  }
}

/**
 * Process all queued messages (status='queued') and send them.
 * Called by a cron job or manually from the admin panel.
 */
export async function processQueuedMessages(supabase: SupabaseClient): Promise<number> {
  const { data: queued } = await supabase
    .from('message_logs')
    .select('*, lead:leads(name, email, phone)')
    .eq('status', 'queued')
    .limit(50)

  if (!queued?.length) return 0

  let processed = 0

  for (const msg of queued) {
    const lead = msg.lead as any
    if (!lead) continue

    const template = DEFAULT_TEMPLATES.find((t) => t.id === msg.template)
    if (!template) continue

    const variables: Record<string, string> = {
      name: lead.name ?? '',
      first_name: (lead.name ?? '').split(' ')[0],
    }

    const subject = interpolate(template.subject, variables)
    const body = interpolate(template.body, variables)

    let status = 'failed'

    try {
      switch (msg.channel) {
        case 'email':
          if (lead.email) {
            const r = await sendEmail(lead.email, subject, body)
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
            const r = await sendWhatsApp(lead.phone, body)
            status = r.success ? 'sent' : 'failed'
          }
          break
      }
    } catch {
      status = 'failed'
    }

    await supabase
      .from('message_logs')
      .update({ status, sent_at: new Date().toISOString() })
      .eq('id', msg.id)

    processed++
  }

  return processed
}
