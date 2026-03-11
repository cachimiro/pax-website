import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, buildEnrichedContext, formatContextForPrompt } from '@/lib/crm/ai-context'
import type { MessageChannel } from '@/lib/crm/types'

const TONE_GUIDE: Record<string, string> = {
  formal: 'Use a professional, structured tone. Full sentences, proper greetings and sign-offs.',
  friendly: 'Use a warm, approachable tone. Conversational but still professional. Use the lead\'s first name naturally.',
  brief: 'Be concise and direct. Short sentences, no filler. Get to the point quickly while remaining polite.',
}

const CHANNEL_GUIDE: Record<string, string> = {
  email: 'Format as an email. Include a clear subject line. Use paragraphs. Sign off professionally. Aim for 80-150 words in the body.',
  sms: 'Format as an SMS. MUST be 160 characters or fewer. No subject line. No greeting/sign-off unless very short.',
  whatsapp: 'Format as a WhatsApp message. Conversational, slightly informal. No subject line. Keep under 300 characters.',
}

/**
 * Generate and persist an AI message draft for a lead.
 * Called automatically on stage transitions or on-demand from the UI.
 * Stores the draft in message_logs with status='draft' so the compose
 * panel can pre-populate it.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    lead_id,
    opportunity_id,
    channel = 'email' as MessageChannel,
    tone = 'friendly',
    intent,
  } = await request.json()

  if (!lead_id) return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })

  // Fetch lead + opportunity
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, phone, project_type, budget_band, preferred_channel')
    .eq('id', lead_id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data: opp } = opportunity_id
    ? await supabase.from('opportunities').select('stage, package_complexity, entry_route').eq('id', opportunity_id).maybeSingle()
    : { data: null }

  const ctx = await buildEnrichedContext(supabase, lead_id, opportunity_id)
  const contextBlock = formatContextForPrompt(ctx)
  const firstName = lead.name?.split(' ')[0] ?? null

  const systemPrompt = `You are a message composer for PaxBespoke. You draft messages that sales reps send to leads.

${BUSINESS_CONTEXT}

TONE: ${TONE_GUIDE[tone] ?? TONE_GUIDE.friendly}

CHANNEL: ${CHANNEL_GUIDE[channel] ?? CHANNEL_GUIDE.email}

RULES:
- ${firstName ? `Address the lead as "${firstName}"` : 'Do not use a name in the salutation'}
- Do NOT fabricate specific dates, times, prices, or links — use placeholders like {{date}}, {{amount}}, {{booking_link}} where needed
- Do NOT open with filler phrases like "I hope this finds you well", "Just wanted to reach out", or similar
- For email: start with "Subject: ..." on the first line, then a blank line, then the body
- For SMS/WhatsApp: provide only the message body, no subject

Respond with ONLY the message text. No JSON, no markdown, no explanations.`

  const intentDesc = intent ?? `Follow-up for stage: ${opp?.stage ?? 'unknown'}`
  const maxTokens = channel === 'sms' ? 100 : channel === 'whatsapp' ? 200 : 500

  try {
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Draft a ${channel} message for this intent: ${intentDesc}\n\n${contextBlock}` },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''

    let subject: string | undefined
    let body = raw

    if (channel === 'email' && raw.startsWith('Subject:')) {
      const lines = raw.split('\n')
      subject = lines[0].replace(/^Subject:\s*/, '').trim()
      body = lines.slice(1).join('\n').replace(/^\n+/, '')
    }

    // Persist as draft in message_logs
    const { data: draft, error: insertError } = await supabase
      .from('message_logs')
      .insert({
        lead_id,
        channel,
        template: 'ai_draft',
        sent_at: new Date().toISOString(),
        status: 'draft',
        metadata: {
          subject,
          body,
          opportunity_id: opportunity_id ?? null,
          intent: intentDesc,
          tone,
          ai_generated: true,
        },
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('draft-message insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ draft_id: draft.id, subject, body, channel })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Draft generation failed'
    console.error('AI draft-message error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
