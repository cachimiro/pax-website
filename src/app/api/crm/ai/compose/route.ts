import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, buildEnrichedContext, formatContextForPrompt } from '@/lib/crm/ai-context'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead, opportunity, channel, tone, intent, recentMessages, customInstructions } = await request.json()
  if (!lead || !channel) {
    return NextResponse.json({ error: 'lead and channel are required' }, { status: 400 })
  }

  const openai = getOpenAI()
  const firstName = lead.name?.split(' ')[0] ?? 'there'

  // Fetch enriched context if lead has an ID
  let contextBlock = ''
  if (lead.id) {
    try {
      const ctx = await buildEnrichedContext(supabase, lead.id, opportunity?.id)
      contextBlock = formatContextForPrompt(ctx)
    } catch {
      // Fall back to basic context
    }
  }

  const toneGuide: Record<string, string> = {
    formal: 'Use a professional, structured tone. Full sentences, proper greetings and sign-offs.',
    friendly: 'Use a warm, approachable tone. Conversational but still professional. Use the lead\'s first name naturally.',
    brief: 'Be concise and direct. Short sentences, no filler. Get to the point quickly while remaining polite.',
  }

  const channelGuide: Record<string, string> = {
    email: 'Format as an email. Include a clear subject line. Use paragraphs. Sign off professionally. Aim for 80-150 words in the body.',
    sms: 'Format as an SMS. MUST be 160 characters or fewer. No subject line. No greeting/sign-off unless very short. Be extremely concise.',
    whatsapp: 'Format as a WhatsApp message. Conversational, slightly informal. No subject line. Can use line breaks. Keep under 300 characters. Emojis are acceptable but use sparingly (max 1-2).',
  }

  const intentLabels: Record<string, string> = {
    welcome: 'Welcome/introduction message after a new enquiry',
    follow_up: 'General follow-up to check in',
    call1_followup: 'Follow-up after the first consultation call — recap and next steps',
    design_ready: 'Notify client their 3D design is ready to view',
    quote_followup: 'Follow-up on a quote that hasn\'t received a response — mention the amount and design',
    visit_invite: 'Invite client to book a site visit for measurements',
    post_visit_followup: 'Follow-up after a site visit — recap what was discussed and next steps',
    fitting_proposal: 'Propose fitting dates for the client to choose from',
    fitting_confirmation: 'Confirm the selected fitting date',
    proposal_followup: 'Follow-up on a proposal that hasn\'t received a response',
    deposit_reminder: 'Reminder to pay the deposit to secure the fitting slot — mention the amount',
    deposit_confirmation: 'Confirmation that the deposit has been received and fitting is secured',
    booking_confirm: 'Confirmation of an upcoming appointment',
    on_hold_checkin: 'Nurture check-in for a lead that\'s on hold — gentle, no pressure',
    payment_reminder: 'Reminder about an outstanding payment',
  }

  const systemPrompt = `You are a message composer for PaxBespoke. You draft messages that sales reps send to leads.

${BUSINESS_CONTEXT}

TONE: ${toneGuide[tone] ?? toneGuide.friendly}

CHANNEL: ${channelGuide[channel] ?? channelGuide.email}

RULES:
- Address the lead as "${firstName}"
- Do NOT fabricate specific dates, times, prices, or links — use placeholders like {{date}}, {{time}}, {{amount}}, {{booking_link}}, {{payment_link}} where needed
- Do NOT mention competitors or make promises about timelines you can't verify
- Keep the message natural and human-sounding, not robotic
- For email: provide both a subject line and body, separated by a blank line after "Subject: ..."
- For SMS/WhatsApp: provide only the message body, no subject

Respond with ONLY the message text. No JSON wrapping, no markdown, no explanations.
${channel === 'email' ? 'Start with "Subject: ..." on the first line, then a blank line, then the body.' : ''}`

  const intentDesc = intentLabels[intent] ?? intent ?? 'General message'

  const userPrompt = `Draft a ${channel} message for this intent: ${intentDesc}

${contextBlock || `Lead: ${lead.name}\nProject: ${lead.project_type ?? 'wardrobe'}\nBudget: ${lead.budget_band ?? 'unknown'}\nStage: ${opportunity?.stage ?? 'unknown'}`}
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}`

  // Token limits by channel
  const maxTokens = channel === 'sms' ? 100 : channel === 'whatsapp' ? 200 : 500

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    const tokensUsed = completion.usage?.total_tokens ?? 0

    // Parse subject from email responses
    let subject: string | undefined
    let body = raw

    if (channel === 'email' && raw.startsWith('Subject:')) {
      const lines = raw.split('\n')
      subject = lines[0].replace(/^Subject:\s*/, '').trim()
      // Skip the subject line and any blank lines after it
      body = lines.slice(1).join('\n').replace(/^\n+/, '')
    }

    return NextResponse.json({
      subject,
      body,
      tone_used: tone ?? 'friendly',
      tokens_used: tokensUsed,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI compose failed'
    console.error('AI compose error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
