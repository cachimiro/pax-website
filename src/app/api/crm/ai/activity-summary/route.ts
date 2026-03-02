import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, buildEnrichedContext, formatContextForPrompt, safeParseAIJson } from '@/lib/crm/ai-context'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead } = await request.json()
  if (!lead?.id) return NextResponse.json({ error: 'lead is required' }, { status: 400 })

  try {
    const ctx = await buildEnrichedContext(supabase, lead.id)
    const openai = getOpenAI()

    const systemPrompt = `You are a sales assistant for PaxBespoke. Summarise a lead's activity history into a concise narrative.

${BUSINESS_CONTEXT}

${PIPELINE_STAGES}

Respond with ONLY valid JSON:
{
  "narrative": "<2-4 sentence summary of this lead's journey — read like a brief to a colleague taking over>",
  "key_milestones": ["<milestone>", ...],
  "days_in_pipeline": ${ctx.opportunity?.days_in_pipeline ?? 0},
  "engagement_level": "high|medium|low",
  "next_milestone": "<what should happen next based on current stage and data>",
  "risk_note": "<risk or concern, or null if healthy>"
}

Rules:
- Include visit, design, quote, and fitting milestones when they exist
- Mention the entry route and package if known
- Key milestones: max 5, most recent first
- Be factual — don't invent details not in the data`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Summarise this lead's activity:\n\n${formatContextForPrompt(ctx)}` },
      ],
      temperature: 0.4,
      max_tokens: 500,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw)
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI activity summary failed'
    console.error('AI activity-summary error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
