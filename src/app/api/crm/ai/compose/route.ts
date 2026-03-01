import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'

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

  const toneGuide: Record<string, string> = {
    formal: 'Use a professional, structured tone. Full sentences, proper greetings and sign-offs. Suitable for formal business correspondence.',
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
    proposal_followup: 'Follow-up on a proposal that hasn\'t received a response',
    deposit_reminder: 'Reminder to pay the deposit to secure the project',
    deposit_confirmation: 'Confirmation that the deposit has been received',
    booking_confirm: 'Confirmation of an upcoming appointment',
    payment_reminder: 'Reminder about an outstanding payment',
  }

  const systemPrompt = `You are a message composer for PaxBespoke, a premium bespoke IKEA Pax wardrobe company operating UK-wide. You draft messages that sales reps send to leads.

BRAND CONTEXT:
- PaxBespoke designs, builds, and installs custom wardrobes using IKEA Pax frames
- Premium service with free consultation calls, professional onboarding visits, and full installation
- Typical project value: £1,500–£8,000+

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

  const contextParts: string[] = []
  contextParts.push(`Lead: ${lead.name}`)
  if (lead.project_type) contextParts.push(`Project: ${lead.project_type}`)
  if (lead.budget_band) contextParts.push(`Budget: ${lead.budget_band}`)
  if (lead.postcode) contextParts.push(`Location: ${lead.postcode}`)
  if (lead.source) contextParts.push(`Source: ${lead.source}`)
  if (opportunity) {
    contextParts.push(`Pipeline stage: ${opportunity.stage?.replace(/_/g, ' ')}`)
    if (opportunity.value_estimate) contextParts.push(`Value: £${opportunity.value_estimate}`)
  }
  if (recentMessages?.length) {
    const recent = recentMessages.slice(0, 3).map((m: { channel: string; template: string; sent_at: string }) =>
      `${m.channel} — ${m.template ?? 'custom'} (${new Date(m.sent_at).toLocaleDateString('en-GB')})`
    ).join('; ')
    contextParts.push(`Recent messages: ${recent}`)
  }

  const intentDesc = intentLabels[intent] ?? intent ?? 'General message'

  const userPrompt = `Draft a ${channel} message for this intent: ${intentDesc}

Context:
${contextParts.join('\n')}
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
