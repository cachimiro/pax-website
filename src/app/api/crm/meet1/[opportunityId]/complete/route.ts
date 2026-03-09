import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processPostCallNotes } from '@/lib/crm/post-call-ai'
import { runStageAutomations } from '@/lib/crm/automation'

type Params = { params: Promise<{ opportunityId: string }> }

/**
 * POST /api/crm/meet1/[opportunityId]/complete
 *
 * Marks the Meet 1 guide as complete:
 * 1. Saves final call notes to meet1_notes
 * 2. Writes post_call_notes + outcome to the booking record
 * 3. Runs AI post-call analysis (existing flow)
 * 4. Advances opportunity stage to meet1_completed
 * 5. Triggers stage automations (thank-you email etc.)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { opportunityId } = await params
  const admin = createAdminClient()
  const { bookingId, callNotes } = await req.json()

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  // 1. Mark meet1_notes as completed
  await admin
    .from('meet1_notes')
    .update({
      call_notes: callNotes ?? null,
      completed: true,
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    })
    .eq('opportunity_id', opportunityId)

  // 2. Mark booking as completed with notes
  await admin
    .from('bookings')
    .update({
      outcome: 'completed',
      post_call_notes: callNotes ?? null,
      actual_end: new Date().toISOString(),
    })
    .eq('id', bookingId)

  // 3. Advance opportunity stage (call1_scheduled → meet1_completed)
  const { data: opp } = await admin
    .from('opportunities')
    .select('stage, lead_id, owner_user_id')
    .eq('id', opportunityId)
    .single()

  if (opp?.stage === 'call1_scheduled') {
    await admin
      .from('opportunities')
      .update({ stage: 'meet1_completed' })
      .eq('id', opportunityId)

    await admin.from('stage_log').insert({
      opportunity_id: opportunityId,
      from_stage: 'call1_scheduled',
      to_stage: 'meet1_completed',
      changed_by: user.id,
      notes: 'Meet 1 completed via Call Guide',
    })
  }

  // 4. Run stage automations (meet1_thanks email etc.)
  runStageAutomations(admin, opportunityId, 'meet1_completed').catch((err) =>
    console.error('[MEET1-COMPLETE] Automation error:', err)
  )

  // 5. Run AI post-call analysis in background (non-blocking)
  let aiResult = null
  if (callNotes?.trim()) {
    try {
      aiResult = await processPostCallNotes(admin, bookingId, callNotes, user.id)
    } catch (err) {
      console.error('[MEET1-COMPLETE] AI analysis error:', err)
    }
  }

  return NextResponse.json({
    success: true,
    autoMoved: aiResult?.autoMoved ?? false,
    newStage: aiResult?.newStage ?? null,
    suggestion: aiResult?.suggestion ?? null,
  })
}
