import type { Lead, OpportunityWithLead, Task, MessageLog } from './types'
import type { LeadScore } from './scoring'
import { differenceInDays, differenceInHours, isWeekend, subDays } from 'date-fns'

export type RiskLevel = 'high' | 'medium' | 'none'

export interface RiskAssessment {
  level: RiskLevel
  reason: string       // short one-liner for UI display
  action: string       // recommended next action
  daysSinceActivity: number
}

// Stale thresholds by lead tier (in business days)
const STALE_THRESHOLDS: Record<LeadScore['tier'], number> = {
  hot: 3,
  warm: 5,
  cold: 7,
}

// Stage-specific urgency windows (calendar days before flagging)
const STAGE_URGENCY: Record<string, number> = {
  new_enquiry: 2,
  call1_scheduled: 3,
  qualified: 5,
  call2_scheduled: 3,
  proposal_agreed: 7,
  awaiting_deposit: 5,
  deposit_paid: 3,
  onboarding_scheduled: 2,
}

/**
 * Count business days between two dates (excludes weekends).
 */
export function businessDaysBetween(from: Date, to: Date): number {
  let count = 0
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current < end) {
    current.setDate(current.getDate() + 1)
    if (!isWeekend(current)) count++
  }
  return count
}

/**
 * Assess risk for a lead/opportunity combination.
 * Returns 'none' if the lead is healthy, snoozed, or too new.
 */
export function assessRisk({
  lead,
  opportunity,
  tasks,
  messages,
  tier,
  snoozeWeekends = true,
}: {
  lead: Lead
  opportunity?: OpportunityWithLead | null
  tasks: Task[]
  messages: MessageLog[]
  tier: LeadScore['tier']
  snoozeWeekends?: boolean
}): RiskAssessment {
  const now = new Date()

  // Snoozed leads are never at risk
  if (lead.snoozed_until && new Date(lead.snoozed_until) > now) {
    return { level: 'none', reason: '', action: '', daysSinceActivity: 0 }
  }

  // New leads (<24h) are never at risk
  const leadAge = differenceInHours(now, new Date(lead.created_at))
  if (leadAge < 24) {
    return { level: 'none', reason: 'New — awaiting first contact', action: 'Reach out to introduce yourself', daysSinceActivity: 0 }
  }

  const stage = opportunity?.stage
  const lastActivityDate = getLastActivityDate(lead, opportunity, messages)
  const daysSinceActivity = snoozeWeekends
    ? businessDaysBetween(lastActivityDate, now)
    : differenceInDays(now, lastActivityDate)

  // 1. Overdue tasks — highest priority signal
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'done' && t.due_at && new Date(t.due_at) < now
  )
  if (overdueTasks.length > 0) {
    return {
      level: 'high',
      reason: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      action: `Complete: ${overdueTasks[0].type}${overdueTasks[0].description ? ` — ${overdueTasks[0].description}` : ''}`,
      daysSinceActivity,
    }
  }

  // 2. Unanswered outbound message (48+ hours)
  const lastOutbound = messages.find((m) => m.status === 'sent' || m.status === 'delivered')
  if (lastOutbound) {
    const hoursSinceSent = differenceInHours(now, new Date(lastOutbound.sent_at))
    if (hoursSinceSent >= 48) {
      // Check if there's been any inbound after the outbound
      const hasResponse = messages.some(
        (m) => m.status === 'received' && new Date(m.sent_at) > new Date(lastOutbound.sent_at)
      )
      if (!hasResponse) {
        const days = Math.round(hoursSinceSent / 24)
        return {
          level: days >= 5 ? 'high' : 'medium',
          reason: `No response in ${days}d`,
          action: 'Follow up — last message unanswered',
          daysSinceActivity,
        }
      }
    }
  }

  // 3. Stage-specific staleness
  if (stage && STAGE_URGENCY[stage]) {
    const stageThreshold = STAGE_URGENCY[stage]
    const daysInStage = snoozeWeekends
      ? businessDaysBetween(new Date(opportunity!.updated_at), now)
      : differenceInDays(now, new Date(opportunity!.updated_at))

    if (daysInStage > stageThreshold * 2) {
      return {
        level: 'high',
        reason: `Stuck in ${formatStage(stage)} for ${daysInStage}d`,
        action: getStageAction(stage),
        daysSinceActivity,
      }
    }
    if (daysInStage > stageThreshold) {
      return {
        level: 'medium',
        reason: `${formatStage(stage)} for ${daysInStage}d`,
        action: getStageAction(stage),
        daysSinceActivity,
      }
    }
  }

  // 4. General staleness by tier
  const threshold = STALE_THRESHOLDS[tier]
  if (daysSinceActivity > threshold * 2) {
    return {
      level: 'high',
      reason: `No activity in ${daysSinceActivity}d`,
      action: 'Re-engage — lead going cold',
      daysSinceActivity,
    }
  }
  if (daysSinceActivity > threshold) {
    return {
      level: 'medium',
      reason: `${daysSinceActivity}d since last activity`,
      action: 'Check in with lead',
      daysSinceActivity,
    }
  }

  return { level: 'none', reason: '', action: '', daysSinceActivity }
}

function getLastActivityDate(
  lead: Lead,
  opportunity?: OpportunityWithLead | null,
  messages?: MessageLog[]
): Date {
  const dates = [new Date(lead.created_at)]

  if (opportunity) {
    dates.push(new Date(opportunity.updated_at))
  }

  if (messages?.length) {
    dates.push(new Date(messages[0].sent_at))
  }

  return dates.reduce((latest, d) => (d > latest ? d : latest))
}

/**
 * Lightweight risk check for pipeline cards — uses only opportunity data.
 * For the full assessment (tasks, messages), use assessRisk().
 */
export function assessOpportunityRisk(
  opportunity: OpportunityWithLead,
  snoozeWeekends = true
): { level: RiskLevel; reason: string } {
  const now = new Date()
  const stage = opportunity.stage

  // Completed or lost — no risk
  if (stage === 'complete' || stage === 'lost') {
    return { level: 'none', reason: '' }
  }

  // Check if lead is snoozed
  if (opportunity.lead?.snoozed_until && new Date(opportunity.lead.snoozed_until) > now) {
    return { level: 'none', reason: '' }
  }

  const threshold = STAGE_URGENCY[stage]
  if (!threshold) return { level: 'none', reason: '' }

  const daysInStage = snoozeWeekends
    ? businessDaysBetween(new Date(opportunity.updated_at), now)
    : differenceInDays(now, new Date(opportunity.updated_at))

  if (daysInStage > threshold * 2) {
    return { level: 'high', reason: `${daysInStage}d in ${formatStage(stage)}` }
  }
  if (daysInStage > threshold) {
    return { level: 'medium', reason: `${daysInStage}d in ${formatStage(stage)}` }
  }

  return { level: 'none', reason: '' }
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStageAction(stage: string): string {
  const actions: Record<string, string> = {
    new_enquiry: 'Make first contact',
    call1_scheduled: 'Confirm call appointment',
    qualified: 'Schedule design consultation',
    call2_scheduled: 'Prepare proposal',
    proposal_agreed: 'Send deposit request',
    awaiting_deposit: 'Follow up on deposit',
    deposit_paid: 'Schedule onboarding',
    onboarding_scheduled: 'Prepare onboarding materials',
  }
  return actions[stage] ?? 'Follow up'
}
