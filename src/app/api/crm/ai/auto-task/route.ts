import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, buildEnrichedContext, formatContextForPrompt, formatBenchmarks, safeParseAIJson } from '@/lib/crm/ai-context'

interface AutoTaskResult {
  title: string
  description: string
  due_in_days: number
  type: string
  reason: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, opportunity_id } = await request.json()
  if (!lead_id) return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })

  try {
    const ctx = await buildEnrichedContext(supabase, lead_id, opportunity_id)
    const openai = getOpenAI()

    const systemPrompt = `You are an AI sales assistant for PaxBespoke. Based on the lead's current state, suggest ONE specific follow-up task that should be created.

${BUSINESS_CONTEXT}

${PIPELINE_STAGES}

RULES:
- Suggest a task that is not already in the open tasks list
- Be specific: include the lead's name, relevant dates, or amounts
- due_in_days should be 0 (today), 1, 2, 3, 5, 7, or 14
- type must be one of: call_attempt, send_email, send_quote, schedule_visit, create_design, follow_up, nurture_checkin, confirm_fitting, other
- Only suggest a task if there is a genuine gap — if tasks are already well-covered, return null

Respond with ONLY valid JSON or null:
{
  "title": "<short task title>",
  "description": "<specific description referencing lead name and context>",
  "due_in_days": <number>,
  "type": "<type>",
  "reason": "<why this task is needed now>"
}`

    const benchmarkText = formatBenchmarks(ctx.benchmarks, ctx.opportunity?.stage)
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Should a new task be created for this lead?\n\n${formatContextForPrompt(ctx)}${benchmarkText}` },
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? 'null'

    // Handle explicit null response
    if (raw === 'null' || raw === '') {
      return NextResponse.json({ task: null, reason: 'No task needed' })
    }

    const parsed = safeParseAIJson(raw)
    if (!parsed) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })
    const result = parsed as unknown as AutoTaskResult

    // Create the task in the database
    const dueAt = new Date(Date.now() + result.due_in_days * 24 * 60 * 60 * 1000).toISOString()

    const { data: opp } = await supabase
      .from('opportunities')
      .select('owner_user_id')
      .eq('id', opportunity_id)
      .maybeSingle()

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        opportunity_id: opportunity_id ?? null,
        type: result.type,
        description: result.description,
        due_at: dueAt,
        owner_user_id: opp?.owner_user_id ?? user.id,
        status: 'open',
        ai_auto_created: true,
      })
      .select('id')
      .single()

    if (taskError) {
      console.error('auto-task insert error:', taskError.message)
      return NextResponse.json({ error: taskError.message }, { status: 500 })
    }

    return NextResponse.json({ task: { ...result, id: task.id, due_at: dueAt } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auto-task failed'
    console.error('AI auto-task error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
