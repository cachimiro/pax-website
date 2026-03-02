import type { SupabaseClient } from '@supabase/supabase-js'
import { getOpenAI, MODEL } from './openai'
import { BUSINESS_CONTEXT, safeParseAIJson } from './ai-context'

export interface EmailClassification {
  intent: 'question' | 'ready_to_proceed' | 'objection' | 'scheduling' | 'cancellation' | 'general' | 'out_of_scope'
  sentiment: 'positive' | 'negative' | 'neutral'
  urgency: 'high' | 'medium' | 'low'
  summary: string
  suggested_action: string | null
  suggested_stage: string | null
  objections: string[]
}

/**
 * Classify an inbound email from a lead using AI.
 * Returns intent, sentiment, urgency, and suggested actions.
 */
export async function classifyInboundEmail(
  supabase: SupabaseClient,
  leadId: string,
  subject: string,
  body: string,
  opportunityStage?: string
): Promise<EmailClassification | null> {
  const openai = getOpenAI()

  // Get lead context
  const { data: lead } = await supabase
    .from('leads')
    .select('name, project_type, budget_band')
    .eq('id', leadId)
    .single()

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `You classify inbound emails from leads for PaxBespoke.

${BUSINESS_CONTEXT}

Classify the email and respond with ONLY valid JSON:
{
  "intent": "question" | "ready_to_proceed" | "objection" | "scheduling" | "cancellation" | "general" | "out_of_scope",
  "sentiment": "positive" | "negative" | "neutral",
  "urgency": "high" | "medium" | "low",
  "summary": "<1 sentence summary of what the customer is saying>",
  "suggested_action": "<what the rep should do, or null>",
  "suggested_stage": "<pipeline stage to move to, or null if no change>",
  "objections": ["<objection 1>", ...]
}

Rules:
- "ready_to_proceed": customer says yes, let's go ahead, wants to book, etc.
- "objection": price concern, timing issue, comparing options, etc.
- "cancellation": wants to cancel, not interested, stop contacting
- "scheduling": wants to reschedule, change time, confirm appointment
- urgency "high": cancellation, ready to proceed, time-sensitive scheduling
- urgency "medium": questions, objections that need addressing
- urgency "low": general info, out of scope
- suggested_stage: only suggest if the email clearly indicates a stage change
- Extract specific objections (price, timing, quality, etc.) into the array`,
        },
        {
          role: 'user',
          content: `Lead: ${lead?.name ?? 'Unknown'}
Project: ${lead?.project_type ?? 'wardrobe'}
Current stage: ${opportunityStage ?? 'unknown'}

Email subject: ${subject}
Email body:
${body.substring(0, 1500)}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return null

    const parsed = safeParseAIJson(raw) as EmailClassification | null
    if (!parsed) return null

    // Validate
    const validIntents = ['question', 'ready_to_proceed', 'objection', 'scheduling', 'cancellation', 'general', 'out_of_scope']
    if (!validIntents.includes(parsed.intent)) parsed.intent = 'general'
    if (!['positive', 'negative', 'neutral'].includes(parsed.sentiment)) parsed.sentiment = 'neutral'
    if (!['high', 'medium', 'low'].includes(parsed.urgency)) parsed.urgency = 'low'
    if (!Array.isArray(parsed.objections)) parsed.objections = []

    return parsed
  } catch (err: any) {
    console.error('[AI-EMAIL-CLASSIFY] Error:', err.message)
    return null
  }
}

/**
 * Classify and store the result in message_logs metadata.
 */
export async function classifyAndStoreEmail(
  supabase: SupabaseClient,
  messageLogId: string,
  leadId: string,
  subject: string,
  body: string,
  opportunityStage?: string
): Promise<EmailClassification | null> {
  const classification = await classifyInboundEmail(supabase, leadId, subject, body, opportunityStage)

  if (classification) {
    // Update the message log with classification
    await supabase
      .from('message_logs')
      .update({
        metadata: {
          ai_classification: classification,
        },
      })
      .eq('id', messageLogId)
  }

  return classification
}
