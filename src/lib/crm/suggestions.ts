import type { OpportunityWithLead, OpportunityStage } from './types'
import { differenceInDays } from 'date-fns'

export interface Suggestion {
  action: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
  icon: 'phone' | 'mail' | 'clock' | 'pound' | 'calendar' | 'check'
}

const STAGE_TARGETS: Record<string, { days: number; action: string; icon: Suggestion['icon'] }> = {
  new_enquiry:         { days: 1,  action: 'Call to introduce yourself', icon: 'phone' },
  call1_scheduled:     { days: 3,  action: 'Confirm Call 1 appointment', icon: 'calendar' },
  qualified:           { days: 5,  action: 'Schedule Call 2 to discuss design', icon: 'phone' },
  call2_scheduled:     { days: 3,  action: 'Prepare proposal for Call 2', icon: 'calendar' },
  proposal_agreed:     { days: 7,  action: 'Send deposit request', icon: 'pound' },
  awaiting_deposit:    { days: 5,  action: 'Follow up on deposit payment', icon: 'pound' },
  deposit_paid:        { days: 3,  action: 'Schedule onboarding session', icon: 'calendar' },
  onboarding_scheduled:{ days: 2,  action: 'Prepare onboarding materials', icon: 'check' },
  onboarding_complete: { days: 3,  action: 'Confirm production start date', icon: 'check' },
  production:          { days: 14, action: 'Update client on production progress', icon: 'mail' },
  installation:        { days: 7,  action: 'Confirm installation date', icon: 'calendar' },
}

export function getSuggestion(opp: OpportunityWithLead): Suggestion | null {
  const config = STAGE_TARGETS[opp.stage]
  if (!config) return null

  const daysInStage = differenceInDays(new Date(), new Date(opp.updated_at))
  const leadName = opp.lead?.name?.split(' ')[0] ?? 'Lead'

  if (daysInStage > config.days * 2) {
    return {
      action: `${config.action} — ${leadName} has been waiting ${daysInStage} days`,
      reason: `Overdue by ${daysInStage - config.days} days`,
      urgency: 'high',
      icon: config.icon,
    }
  }

  if (daysInStage >= config.days) {
    return {
      action: `${config.action} for ${leadName}`,
      reason: `Target: ${config.days}d, current: ${daysInStage}d`,
      urgency: 'medium',
      icon: config.icon,
    }
  }

  // Within target — still show the action but low urgency
  return {
    action: `${config.action} for ${leadName}`,
    reason: `${config.days - daysInStage}d remaining`,
    urgency: 'low',
    icon: config.icon,
  }
}

export function getUrgencyColor(urgency: Suggestion['urgency']): string {
  return {
    high: 'text-red-700 bg-red-50 border-red-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low: 'text-[var(--green-700)] bg-[var(--green-50)] border-[var(--green-200)]',
  }[urgency]
}
