import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, buildEnrichedContext, formatContextForPrompt, safeParseAIJson } from '@/lib/crm/ai-context'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead, opportunity } = await request.json()
  if (!lead?.id) return NextResponse.json({ error: 'lead is required' }, { status: 400 })

  try {
    const ctx = await buildEnrichedContext(supabase, lead.id, opportunity?.id)
    const openai = getOpenAI()

    const systemPrompt = `You are an AI sales analyst for PaxBespoke. Score leads 0-100 and provide reasoning.

${BUSINESS_CONTEXT}

${PIPELINE_STAGES}

Score based on:
1. Budget fit (0-25): £5000+ ideal. Budget package = lower value. Select = highest.
2. Location & logistics (0-15): Valid UK postcode. Visit feasibility for Standard/Select.
3. Engagement signals (0-20): Has phone + email + postcode + project details. Responded to messages. Attended calls.
4. Project type & package (0-20): Walk-in wardrobes and Select package highest. Budget package lowest.
5. Pipeline momentum (0-20): Moving through stages on time. No stalls. Designs created, quotes sent, visits completed.

Respond with ONLY valid JSON:
{
  "score": <0-100>,
  "tier": "hot" | "warm" | "cold",
  "summary": "<one sentence>",
  "factors": [{ "label": "<name>", "score": <n>, "max": <max>, "insight": "<brief>" }],
  "closing_tip": "<one actionable tip>"
}`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Score this lead:\n\n${formatContextForPrompt(ctx)}` },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw)
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI scoring failed'
    console.error('AI score error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
