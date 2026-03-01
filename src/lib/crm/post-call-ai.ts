import type { SupabaseClient } from '@supabase/supabase-js'
import { getOpenAI, MODEL } from './openai'
import type { AISuggestion, OpportunityStage } from './types'

const STAGE_TRANSITIONS: Record<string, OpportunityStage[]> = {
  call1: ['qualified', 'lost'],
  call2: ['proposal_agreed', 'qualified', 'lost'],
  onboarding: ['onboarding_complete', 'lost'],
}

const AUTO_MOVE_THRESHOLD = 90
const NEVER_AUTO_MOVE_TO: OpportunityStage[] = ['lost']

/**
 * Analyse post-call notes using GPT and suggest the next pipeline stage.
 * Returns structured suggestion with confidence score.
 */
export async function analysePostCallNotes(
  supabase: SupabaseClient,
  bookingId: string,
  notes: string
): Promise<AISuggestion | null> {
  // Get booking + opportunity context
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, type, opportunity_id, scheduled_at')
    .eq('id', bookingId)
    .single()

  if (!booking) return null

  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, stage, lead_id, value_estimate')
    .eq('id', booking.opportunity_id)
    .single()

  if (!opp) return null

  const { data: lead } = await supabase
    .from('leads')
    .select('name, project_type, budget_band')
    .eq('id', opp.lead_id)
    .single()

  const possibleStages = STAGE_TRANSITIONS[booking.type] ?? []
  const stageOptions = possibleStages.map((s) => `"${s}"`).join(', ')

  const openai = getOpenAI()

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.1, // Low temperature for consistent, factual analysis
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a CRM assistant for PaxBespoke, a bespoke IKEA Pax wardrobe company. Analyse post-call notes and suggest the next pipeline stage.

You MUST respond with valid JSON matching this exact schema:
{
  "stage": string,       // One of: ${stageOptions}, or "no_change"
  "confidence": number,  // 0-100, how confident you are
  "reasoning": string,   // 1-2 sentences explaining why
  "sentiment": string,   // "positive", "negative", or "mixed"
  "objections": string[],      // List of customer objections mentioned (empty if none)
  "follow_up_actions": string[] // Suggested next actions (1-3 items)
}

Rules:
- Only suggest stages from the allowed list: ${stageOptions}, or "no_change"
- If notes mention the customer wants to proceed, is happy, agreed → suggest forward stage with high confidence
- If notes mention not interested, too expensive, cancelled → suggest "lost" but NEVER with confidence above 85 (always needs human confirmation)
- If notes are ambiguous, mixed signals, or mention needing to think → suggest "no_change" with reasoning
- If notes mention technical issues (connection problems, audio issues) → suggest "no_change" with follow_up_actions to reschedule
- Be conservative: when in doubt, lower the confidence score
- Base your analysis ONLY on what the notes say, do not invent information`,
        },
        {
          role: 'user',
          content: `Call type: ${booking.type === 'call1' ? 'Discovery Call' : booking.type === 'call2' ? 'Design Call' : 'Onboarding Visit'}
Customer: ${lead?.name ?? 'Unknown'}
Project: ${lead?.project_type ?? 'wardrobe'}
Budget: ${lead?.budget_band ?? 'not specified'}
Current stage: ${opp.stage}
Estimated value: ${opp.value_estimate ? `£${opp.value_estimate.toLocaleString()}` : 'not set'}

Post-call notes:
${notes}`,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)

    // Validate the response
    const suggestion: AISuggestion = {
      stage: possibleStages.includes(parsed.stage) || parsed.stage === 'no_change'
        ? parsed.stage
        : 'no_change',
      confidence: Math.min(100, Math.max(0, Math.round(parsed.confidence ?? 0))),
      reasoning: String(parsed.reasoning ?? ''),
      sentiment: ['positive', 'negative', 'mixed'].includes(parsed.sentiment)
        ? parsed.sentiment
        : 'mixed',
      objections: Array.isArray(parsed.objections) ? parsed.objections.map(String) : [],
      follow_up_actions: Array.isArray(parsed.follow_up_actions) ? parsed.follow_up_actions.map(String) : [],
    }

    // Safety: cap confidence for "lost" suggestions
    if (suggestion.stage === 'lost' && suggestion.confidence > 85) {
      suggestion.confidence = 85
    }

    return suggestion
  } catch (err: any) {
    console.error('[POST-CALL-AI] Analysis error:', err.message)
    return null
  }
}

/**
 * Process post-call notes: run AI analysis, store suggestion, and auto-move if confident enough.
 */
export async function processPostCallNotes(
  supabase: SupabaseClient,
  bookingId: string,
  notes: string,
  userId?: string
): Promise<{
  suggestion: AISuggestion | null
  autoMoved: boolean
  newStage: string | null
}> {
  // Save notes to booking
  await supabase
    .from('bookings')
    .update({ post_call_notes: notes })
    .eq('id', bookingId)

  // Run AI analysis
  const suggestion = await analysePostCallNotes(supabase, bookingId, notes)

  if (!suggestion) {
    return { suggestion: null, autoMoved: false, newStage: null }
  }

  // Store suggestion on booking
  await supabase
    .from('bookings')
    .update({ ai_suggestion: suggestion as unknown as Record<string, unknown> })
    .eq('id', bookingId)

  // Get booking for opportunity_id
  const { data: booking } = await supabase
    .from('bookings')
    .select('opportunity_id')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return { suggestion, autoMoved: false, newStage: null }
  }

  // Log the AI suggestion
  await supabase.from('post_call_actions').insert({
    booking_id: bookingId,
    opportunity_id: booking.opportunity_id,
    action_type: 'ai_suggestion',
    suggested_stage: suggestion.stage,
    confidence: suggestion.confidence,
    reasoning: suggestion.reasoning,
    ai_response: suggestion as unknown as Record<string, unknown>,
    acted_by: userId ?? null,
  })

  // Auto-move if confidence is high enough AND not moving to a protected stage
  const shouldAutoMove =
    suggestion.stage !== 'no_change' &&
    suggestion.confidence >= AUTO_MOVE_THRESHOLD &&
    !NEVER_AUTO_MOVE_TO.includes(suggestion.stage as OpportunityStage)

  if (shouldAutoMove) {
    const newStage = suggestion.stage as OpportunityStage

    await supabase
      .from('opportunities')
      .update({ stage: newStage })
      .eq('id', booking.opportunity_id)

    await supabase.from('stage_log').insert({
      opportunity_id: booking.opportunity_id,
      to_stage: newStage,
      changed_by: userId ?? null,
      notes: `AI auto-moved (confidence: ${suggestion.confidence}%): ${suggestion.reasoning}`,
    })

    await supabase.from('post_call_actions').insert({
      booking_id: bookingId,
      opportunity_id: booking.opportunity_id,
      action_type: 'auto_move',
      suggested_stage: newStage,
      actual_stage: newStage,
      confidence: suggestion.confidence,
      reasoning: `Auto-moved to ${newStage} (confidence ${suggestion.confidence}%)`,
      acted_by: userId ?? null,
    })

    return { suggestion, autoMoved: true, newStage }
  }

  return { suggestion, autoMoved: false, newStage: null }
}
