import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OpportunityStage } from '@/lib/crm/types'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  action: z.enum(['confirm', 'override', 'dismiss']),
  stage: z.string().optional(), // Required for 'override'
})

/**
 * POST /api/crm/bookings/confirm
 * Owner confirms, overrides, or dismisses an AI stage suggestion.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { booking_id, action, stage } = parsed.data

  // Get booking with AI suggestion
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, opportunity_id, ai_suggestion')
    .eq('id', booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const suggestion = booking.ai_suggestion as Record<string, unknown> | null

  if (action === 'dismiss') {
    // Clear the suggestion, no stage change
    await supabase
      .from('bookings')
      .update({ ai_suggestion: null })
      .eq('id', booking_id)

    await supabase.from('post_call_actions').insert({
      booking_id,
      opportunity_id: booking.opportunity_id,
      action_type: 'owner_override',
      suggested_stage: suggestion?.stage as string ?? null,
      actual_stage: null,
      reasoning: 'Owner dismissed AI suggestion',
      acted_by: user.id,
    })

    return NextResponse.json({ success: true, action: 'dismissed' })
  }

  // Determine target stage
  let targetStage: OpportunityStage
  if (action === 'confirm') {
    if (!suggestion?.stage || suggestion.stage === 'no_change') {
      return NextResponse.json({ error: 'No stage suggestion to confirm' }, { status: 400 })
    }
    targetStage = suggestion.stage as OpportunityStage
  } else {
    // override
    if (!stage) {
      return NextResponse.json({ error: 'Stage required for override' }, { status: 400 })
    }
    targetStage = stage as OpportunityStage
  }

  // Move the opportunity
  await supabase
    .from('opportunities')
    .update({ stage: targetStage })
    .eq('id', booking.opportunity_id)

  await supabase.from('stage_log').insert({
    opportunity_id: booking.opportunity_id,
    to_stage: targetStage,
    changed_by: user.id,
    notes: action === 'confirm'
      ? `Owner confirmed AI suggestion (${(suggestion?.confidence ?? 0)}% confidence)`
      : `Owner overrode AI suggestion "${suggestion?.stage ?? 'none'}" → "${targetStage}"`,
  })

  // Clear the suggestion from booking
  await supabase
    .from('bookings')
    .update({ ai_suggestion: null })
    .eq('id', booking_id)

  // Log the action
  await supabase.from('post_call_actions').insert({
    booking_id,
    opportunity_id: booking.opportunity_id,
    action_type: action === 'confirm' ? 'owner_confirm' : 'owner_override',
    suggested_stage: suggestion?.stage as string ?? null,
    actual_stage: targetStage,
    confidence: suggestion?.confidence as number ?? null,
    reasoning: action === 'confirm'
      ? `Owner confirmed move to ${targetStage}`
      : `Owner chose ${targetStage} instead of AI suggestion "${suggestion?.stage ?? 'none'}"`,
    acted_by: user.id,
  })

  return NextResponse.json({
    success: true,
    action,
    new_stage: targetStage,
  })
}
