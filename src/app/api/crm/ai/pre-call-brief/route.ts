import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, buildEnrichedContext, formatContextForPrompt, formatBenchmarks, safeParseAIJson } from '@/lib/crm/ai-context'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, opportunity_id, booking_type } = await request.json()
  if (!lead_id) return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })

  try {
    const ctx = await buildEnrichedContext(supabase, lead_id, opportunity_id)

    // Fetch the upcoming booking for context
    const { data: booking } = await supabase
      .from('bookings')
      .select('type, scheduled_at, meet_link, notes')
      .eq('opportunity_id', opportunity_id ?? '')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const openai = getOpenAI()

    const systemPrompt = `You are an AI sales coach for PaxBespoke. Generate a concise pre-call brief to help the sales rep prepare for an upcoming call or meeting.

${BUSINESS_CONTEXT}

${PIPELINE_STAGES}

RULES:
- key_points: 3-5 specific facts the rep should know going into this call (reference actual data)
- suggested_opener: a specific, natural opening line — NOT generic. Reference something real about the lead.
- watch_out_for: any objection, concern, or sensitivity to be aware of (null if none)
- target_outcome: the single most important thing to achieve on this call

Respond with ONLY valid JSON:
{
  "lead_name": "<name>",
  "lead_id": "${lead_id}",
  "call_type": "<type>",
  "scheduled_at": "<ISO string or empty>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>"],
  "suggested_opener": "<specific opener>",
  "watch_out_for": "<concern or null>",
  "target_outcome": "<outcome>"
}`

    const benchmarkText = formatBenchmarks(ctx.benchmarks, ctx.opportunity?.stage)
    const bookingContext = booking
      ? `\nUPCOMING CALL: ${booking.type} at ${new Date(booking.scheduled_at).toLocaleString('en-GB')}${booking.notes ? ` — Notes: ${booking.notes}` : ''}`
      : `\nCALL TYPE: ${booking_type ?? 'consultation'}`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a pre-call brief for this lead:${bookingContext}\n\n${formatContextForPrompt(ctx)}${benchmarkText}` },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw)
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pre-call brief failed'
    console.error('AI pre-call-brief error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
