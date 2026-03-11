import type { SupabaseClient } from '@supabase/supabase-js'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, buildEnrichedContext, formatContextForPrompt, formatBenchmarks, safeParseAIJson } from '@/lib/crm/ai-context'
import type { OpportunityStage } from '@/lib/crm/types'

interface AutoTaskResult {
  title: string
  description: string
  due_in_days: number
  type: string
  reason: string
}

/**
 * Ask the AI whether a supplementary task should be created for this lead.
 * Called after the standard stage-transition task is already created, so the
 * AI only suggests something if there is a genuine gap.
 *
 * Non-throwing — logs errors and returns null on failure so callers are unaffected.
 */
export async function triggerAIAutoTask(
  supabase: SupabaseClient,
  leadId: string,
  opportunityId: string,
  stage: OpportunityStage,
  ownerUserId: string | null,
): Promise<string | null> {
  try {
    const ctx = await buildEnrichedContext(supabase, leadId, opportunityId)
    const openai = getOpenAI()

    const systemPrompt = `You are an AI sales assistant for PaxBespoke. Based on the lead's current state, suggest ONE specific supplementary follow-up task — only if the existing open tasks do not already cover it.

${BUSINESS_CONTEXT}

${PIPELINE_STAGES}

RULES:
- A standard task for this stage transition has already been created — only suggest something additional if genuinely needed
- Be specific: include the lead's name, relevant dates, or amounts
- due_in_days must be 0, 1, 2, 3, 5, 7, or 14
- type must be one of: call_attempt, send_email, send_quote, schedule_visit, create_design, follow_up, nurture_checkin, confirm_fitting, other
- If no additional task is needed, respond with exactly: null

Respond with ONLY valid JSON or the word null:
{
  "title": "<short task title>",
  "description": "<specific description referencing lead name and context>",
  "due_in_days": <number>,
  "type": "<type>",
  "reason": "<why this task is needed>"
}`

    const benchmarkText = formatBenchmarks(ctx.benchmarks, stage)
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Stage just changed to: ${stage}\n\n${formatContextForPrompt(ctx)}${benchmarkText}` },
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? 'null'
    if (raw === 'null' || raw === '') return null

    const parsed = safeParseAIJson(raw)
    if (!parsed) return null
    const result = parsed as unknown as AutoTaskResult

    const dueAt = new Date(Date.now() + result.due_in_days * 24 * 60 * 60 * 1000).toISOString()

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        opportunity_id: opportunityId,
        type: result.type,
        description: result.description,
        due_at: dueAt,
        owner_user_id: ownerUserId,
        status: 'open',
        ai_auto_created: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('AI auto-task insert error:', error.message)
      return null
    }

    return task?.id ?? null
  } catch (err) {
    // Non-critical — don't surface to caller
    console.error('AI auto-task error:', err instanceof Error ? err.message : err)
    return null
  }
}
