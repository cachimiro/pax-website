import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { safeParseAIJson } from '@/lib/crm/ai-context'

/**
 * GET /api/crm/ai/objections
 * Aggregate objections from post-call AI analysis and email classifications.
 * Returns patterns and trends.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch post-call actions with objections
  const { data: postCallActions } = await supabase
    .from('post_call_actions')
    .select('ai_response, suggested_stage, opportunity_id, created_at')
    .eq('action_type', 'ai_suggestion')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(100)

  // Extract objections
  const allObjections: { text: string; stage: string; date: string }[] = []

  for (const action of postCallActions ?? []) {
    const aiResp = action.ai_response as Record<string, unknown> | null
    if (aiResp?.objections && Array.isArray(aiResp.objections)) {
      for (const obj of aiResp.objections) {
        allObjections.push({
          text: String(obj),
          stage: String(action.suggested_stage ?? 'unknown'),
          date: action.created_at,
        })
      }
    }
  }

  if (allObjections.length === 0) {
    return NextResponse.json({
      total: 0,
      categories: [],
      summary: 'No objections recorded in the last 30 days.',
      generated_at: new Date().toISOString(),
    })
  }

  // Use AI to categorise and summarise
  const openai = getOpenAI()

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You analyse sales objections for PaxBespoke (bespoke wardrobe company). Categorise and summarise objection patterns.

Respond with ONLY valid JSON:
{
  "categories": [
    { "name": "<category>", "count": <n>, "examples": ["<example>"], "handling_tip": "<how to address>" }
  ],
  "summary": "<2-3 sentence overview of objection trends>",
  "top_risk": "<the most concerning pattern and what to do about it>"
}`,
        },
        {
          role: 'user',
          content: `Analyse these ${allObjections.length} objections from the last 30 days:\n\n${allObjections.map(o => `- "${o.text}" (stage: ${o.stage})`).join('\n')}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw)
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })

    return NextResponse.json({
      total: allObjections.length,
      ...result,
      generated_at: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Objection analysis failed'
    console.error('AI objections error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
