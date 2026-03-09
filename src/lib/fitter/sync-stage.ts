import { createAdminClient } from '@/lib/supabase/admin'
import type { OpportunityStage } from '@/lib/crm/types'

/**
 * Map fitting_jobs.status to the corresponding opportunity pipeline stage.
 * Called from fitter API endpoints when job status changes.
 */
const STATUS_TO_STAGE: Record<string, OpportunityStage> = {
  offered: 'fitting_confirmed',     // offer sent, but not yet accepted
  assigned: 'fitter_assigned',
  claimed: 'fitter_assigned',
  accepted: 'fitter_assigned',
  in_progress: 'fitting_in_progress',
  completed: 'fitting_complete',
  signed_off: 'sign_off_pending',
  approved: 'complete',
  rejected: 'fitting_in_progress',   // sent back for rework
  open_board: 'fitting_confirmed',   // declined, needs reassignment
  cancelled: 'fitting_confirmed',    // cancelled, back to pre-assignment
}

/**
 * Sync the opportunity's pipeline stage based on the fitting job's status.
 * Only moves forward (or to specific revert stages) — never regresses
 * past where the opportunity already is, except for explicit revert cases.
 */
export async function syncOpportunityStage(
  fittingJobId: string,
  newJobStatus: string,
): Promise<void> {
  const targetStage = STATUS_TO_STAGE[newJobStatus]
  if (!targetStage) return

  const admin = createAdminClient()

  // Get the opportunity ID from the fitting job
  const { data: job } = await admin
    .from('fitting_jobs')
    .select('opportunity_id')
    .eq('id', fittingJobId)
    .single()

  if (!job?.opportunity_id) return

  // Get current opportunity stage
  const { data: opp } = await admin
    .from('opportunities')
    .select('stage')
    .eq('id', job.opportunity_id)
    .single()

  if (!opp) return

  // For revert cases (declined/cancelled/rejected), always update
  const revertStatuses = ['open_board', 'cancelled', 'rejected']
  const isRevert = revertStatuses.includes(newJobStatus)

  if (!isRevert) {
    // For forward progression, only update if the target is "ahead" of current
    const STAGE_RANK: Record<string, number> = {
      fitting_proposed: 0,
      proposal_agreed: 1,
      awaiting_deposit: 2,
      deposit_paid: 3,
      fitting_confirmed: 4,
      fitter_assigned: 5,
      fitting_in_progress: 6,
      fitting_complete: 7,
      sign_off_pending: 8,
      complete: 9,
    }
    const currentRank = STAGE_RANK[opp.stage] ?? -1
    const targetRank = STAGE_RANK[targetStage] ?? -1

    if (targetRank <= currentRank) return // already at or past this stage
  }

  // Update the opportunity stage
  const updates: Record<string, unknown> = {
    stage: targetStage,
    updated_at: new Date().toISOString(),
  }

  // Set KPI timestamps
  if (targetStage === 'complete') {
    updates.completed_at = new Date().toISOString()
  }

  await admin
    .from('opportunities')
    .update(updates)
    .eq('id', job.opportunity_id)

  // Log the stage change
  try {
    await admin.from('stage_log').insert({
      opportunity_id: job.opportunity_id,
      to_stage: targetStage,
      changed_by: null,
    })
  } catch {
    // non-critical
  }

  console.log(`[SYNC] Opportunity ${job.opportunity_id}: ${opp.stage} → ${targetStage} (job status: ${newJobStatus})`)
}
