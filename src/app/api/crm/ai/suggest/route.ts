import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, STAGE_TARGETS, buildEnrichedContext, formatContextForPrompt, safeParseAIJson } from '@/lib/crm/ai-context'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead, opportunity } = await request.json()
  if (!lead?.id) return NextResponse.json({ error: 'lead is required' }, { status: 400 })

  try {
    const ctx = await buildEnrichedContext(supabase, lead.id, opportunity?.id)
    const openai = getOpenAI()

    const systemPrompt = `You are an AI sales coach for PaxBespoke. Analyse the lead's current state and suggest the single best next action.

${BUSINESS_CONTEXT}

${PIPELINE_STAGES}

${STAGE_TARGETS}

RULES:
- Be specific: use the lead's name, mention actual dates, amounts, stages
- Consider the entry route and package when suggesting actions
- If a design hasn't been created yet after Meet 1, that's the priority
- If a quote was sent but no response, suggest follow-up with specific timing
- If visit is required but not scheduled, that's urgent for Standard/Select
- If deposit is pending, suggest a specific follow-up approach
- If lead is on_hold, suggest a nurture approach based on their history

Respond with ONLY valid JSON:
{
  "action": "<specific action, e.g. 'Call Sarah to confirm her site visit for Thursday'>",
  "reason": "<why this is the priority>",
  "urgency": "high" | "medium" | "low",
  "script_hint": "<1 sentence specific to this lead — reference their name, project type, or last interaction. No generic openers like 'just checking in' or 'hope you're well'.>",
  "risk": "<what happens if this isn't done soon>"
}`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `What should the sales rep do next?\n\n${formatContextForPrompt(ctx)}` },
      ],
      temperature: 0.4,
      max_tokens: 400,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw)
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI suggestion failed'
    console.error('AI suggest error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
