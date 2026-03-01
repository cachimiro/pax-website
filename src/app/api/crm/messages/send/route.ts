import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MessageChannel } from '@/lib/crm/types'

interface SendPayload {
  lead_id: string
  channel: MessageChannel
  subject?: string
  body: string
}

/**
 * POST /api/crm/messages/send
 * Queue a message for sending. Inserts into message_logs with status='queued'.
 * Authenticated via session cookie.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: SendPayload = await request.json()

  if (!payload.lead_id || !payload.channel || !payload.body) {
    return NextResponse.json({ error: 'Missing required fields: lead_id, channel, body' }, { status: 400 })
  }

  // Check lead exists and is not opted out
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, phone, opted_out')
    .eq('id', payload.lead_id)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  if (lead.opted_out) {
    return NextResponse.json({ error: 'Lead has opted out of communications' }, { status: 422 })
  }

  // Validate channel has contact info
  if (payload.channel === 'email' && !lead.email) {
    return NextResponse.json({ error: 'Lead has no email address' }, { status: 422 })
  }
  if ((payload.channel === 'sms' || payload.channel === 'whatsapp') && !lead.phone) {
    return NextResponse.json({ error: 'Lead has no phone number' }, { status: 422 })
  }

  // Insert into message_logs as queued
  const { data: log, error } = await supabase
    .from('message_logs')
    .insert({
      lead_id: payload.lead_id,
      channel: payload.channel,
      template: null,
      status: 'queued',
      metadata: {
        subject: payload.subject,
        body: payload.body,
        queued_by: session.user.id,
      },
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: log.id, status: 'queued' })
}
