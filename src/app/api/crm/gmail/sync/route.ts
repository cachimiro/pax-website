import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadGoogleConfig, getGmailClient } from '@/lib/crm/google'
import type { gmail_v1 } from 'googleapis'

/**
 * POST /api/crm/gmail/sync
 * Incremental inbox sync. Call from cron (every 5 min) or manually.
 * Uses Gmail history.list for efficient delta sync.
 * Authenticated via webhook secret or admin session.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')
  const isWebhook = secret && secret === process.env.CRM_WEBHOOK_SECRET

  const supabase = createAdminClient()

  if (!isWebhook) {
    // Check for admin session
    const { createClient } = await import('@/lib/supabase/server')
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await userSupabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const config = await loadGoogleConfig(supabase)
  if (!config || !config.email_active || config.needs_reauth) {
    return NextResponse.json({ synced: 0, reason: 'Gmail not connected or inactive' })
  }

  // Load all lead emails for matching
  const { data: leads } = await supabase
    .from('leads')
    .select('id, email')
    .not('email', 'is', null)
  const leadEmailMap = new Map<string, string>()
  for (const lead of leads ?? []) {
    if (lead.email) leadEmailMap.set(lead.email.toLowerCase(), lead.id)
  }

  let gmail: gmail_v1.Gmail
  try {
    gmail = await getGmailClient(supabase, config)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  let synced = 0

  try {
    if (config.gmail_history_id) {
      // Incremental sync via history.list
      synced = await incrementalSync(gmail, supabase, config, leadEmailMap)
    } else {
      // Initial sync — fetch recent inbox messages
      synced = await initialSync(gmail, supabase, config, leadEmailMap)
    }
  } catch (err: any) {
    // If history ID is invalid (too old), fall back to initial sync
    if (err.code === 404 || err.message?.includes('historyId')) {
      synced = await initialSync(gmail, supabase, config, leadEmailMap)
    } else {
      console.error('[GMAIL SYNC] Error:', err.message)
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  return NextResponse.json({ synced })
}

async function initialSync(
  gmail: gmail_v1.Gmail,
  supabase: any,
  config: any,
  leadEmailMap: Map<string, string>
): Promise<number> {
  // Fetch last 50 messages from inbox
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 50,
    q: 'in:inbox OR in:sent',
  })

  const messageIds = listRes.data.messages ?? []
  let synced = 0
  let latestHistoryId: string | undefined

  for (const msg of messageIds) {
    if (!msg.id) continue
    const result = await processMessage(gmail, supabase, config, msg.id, leadEmailMap)
    if (result.synced) synced++
    if (result.historyId) latestHistoryId = result.historyId
  }

  // Store the latest history ID for future incremental syncs
  if (latestHistoryId) {
    await supabase
      .from('google_config')
      .update({ gmail_history_id: latestHistoryId })
      .eq('id', config.id)
  }

  return synced
}

async function incrementalSync(
  gmail: gmail_v1.Gmail,
  supabase: any,
  config: any,
  leadEmailMap: Map<string, string>
): Promise<number> {
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: config.gmail_history_id,
    historyTypes: ['messageAdded'],
  })

  const history = historyRes.data.history ?? []
  let synced = 0
  let latestHistoryId = historyRes.data.historyId

  for (const entry of history) {
    const added = entry.messagesAdded ?? []
    for (const item of added) {
      if (!item.message?.id) continue
      const result = await processMessage(gmail, supabase, config, item.message.id, leadEmailMap)
      if (result.synced) synced++
    }
  }

  // Update history ID
  if (latestHistoryId) {
    await supabase
      .from('google_config')
      .update({ gmail_history_id: latestHistoryId })
      .eq('id', config.id)
  }

  return synced
}

async function processMessage(
  gmail: gmail_v1.Gmail,
  supabase: any,
  config: any,
  messageId: string,
  leadEmailMap: Map<string, string>
): Promise<{ synced: boolean; historyId?: string }> {
  // Check if already synced
  const { data: existing } = await supabase
    .from('email_messages')
    .select('id')
    .eq('gmail_message_id', messageId)
    .single()

  if (existing) return { synced: false }

  // Fetch full message
  const msgRes = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  const msg = msgRes.data
  if (!msg.payload) return { synced: false }

  const headers = msg.payload.headers ?? []
  const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

  const from = getHeader('From')
  const to = getHeader('To')
  const subject = getHeader('Subject')
  const date = getHeader('Date')

  // Extract email addresses
  const fromEmail = extractEmail(from)
  const toEmail = extractEmail(to)

  // Determine direction
  const isOutbound = fromEmail.toLowerCase() === config.email.toLowerCase()
  const direction = isOutbound ? 'outbound' : 'inbound'

  // Match to lead
  const matchEmail = isOutbound ? toEmail : fromEmail
  const leadId = leadEmailMap.get(matchEmail.toLowerCase()) ?? null

  // Skip if no lead match (we only sync lead-related emails)
  if (!leadId) return { synced: false, historyId: msg.historyId ?? undefined }

  // Extract body
  const { text: bodyText, html: bodyHtml } = extractBody(msg.payload)

  // Upsert thread
  const threadId = msg.threadId
  let dbThreadId: string | null = null

  if (threadId) {
    const { data: existingThread } = await supabase
      .from('email_threads')
      .select('id')
      .eq('gmail_thread_id', threadId)
      .single()

    if (existingThread) {
      dbThreadId = existingThread.id
      await supabase
        .from('email_threads')
        .update({
          last_message_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          message_count: (existingThread as any).message_count + 1,
        })
        .eq('id', dbThreadId)
    } else {
      const { data: newThread } = await supabase
        .from('email_threads')
        .insert({
          gmail_thread_id: threadId,
          lead_id: leadId,
          subject,
          last_message_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          message_count: 1,
        })
        .select('id')
        .single()
      dbThreadId = newThread?.id ?? null
    }
  }

  // Insert message
  await supabase.from('email_messages').insert({
    gmail_message_id: messageId,
    thread_id: dbThreadId,
    lead_id: leadId,
    direction,
    from_address: from,
    to_address: to,
    subject,
    body_text: bodyText?.slice(0, 50000) ?? null,
    body_html: bodyHtml?.slice(0, 100000) ?? null,
    snippet: msg.snippet?.slice(0, 500) ?? null,
    gmail_label_ids: msg.labelIds ?? [],
    received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
  })

  return { synced: true, historyId: msg.historyId ?? undefined }
}

function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/)
  return match ? match[1] : headerValue.trim()
}

function extractBody(payload: gmail_v1.Schema$MessagePart): { text: string | null; html: string | null } {
  let text: string | null = null
  let html: string | null = null

  function walk(part: gmail_v1.Schema$MessagePart) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = Buffer.from(part.body.data, 'base64').toString('utf8')
    }
    if (part.mimeType === 'text/html' && part.body?.data) {
      html = Buffer.from(part.body.data, 'base64').toString('utf8')
    }
    if (part.parts) {
      for (const child of part.parts) walk(child)
    }
  }

  walk(payload)
  return { text, html }
}
