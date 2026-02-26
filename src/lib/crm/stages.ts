import type { OpportunityStage } from './types'

export interface StageConfig {
  label: string
  color: string       // Tailwind bg class
  textColor: string   // Tailwind text class
  dotColor: string    // Tailwind bg class for status dot
}

export const STAGES: Record<OpportunityStage, StageConfig> = {
  new_enquiry:          { label: 'New Enquiry',          color: 'bg-blue-50',    textColor: 'text-blue-700',    dotColor: 'bg-blue-500' },
  call1_scheduled:      { label: 'Call 1 Scheduled',     color: 'bg-blue-50',    textColor: 'text-blue-600',    dotColor: 'bg-blue-400' },
  qualified:            { label: 'Qualified',            color: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500' },
  call2_scheduled:      { label: 'Call 2 Scheduled',     color: 'bg-emerald-50', textColor: 'text-emerald-600', dotColor: 'bg-emerald-400' },
  proposal_agreed:      { label: 'Proposal Agreed',      color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-400' },
  awaiting_deposit:     { label: 'Awaiting Deposit',     color: 'bg-orange-50',  textColor: 'text-orange-700',  dotColor: 'bg-orange-500' },
  deposit_paid:         { label: 'Deposit Paid',         color: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-600' },
  onboarding_scheduled: { label: 'Onboarding Scheduled', color: 'bg-purple-50',  textColor: 'text-purple-700',  dotColor: 'bg-purple-400' },
  onboarding_complete:  { label: 'Onboarding Complete',  color: 'bg-purple-50',  textColor: 'text-purple-700',  dotColor: 'bg-purple-600' },
  production:           { label: 'Production',           color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-500' },
  installation:         { label: 'Installation',         color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-600' },
  complete:             { label: 'Complete',             color: 'bg-emerald-50', textColor: 'text-emerald-800', dotColor: 'bg-emerald-700' },
  lost:                 { label: 'Lost',                 color: 'bg-red-50',     textColor: 'text-red-700',     dotColor: 'bg-red-400' },
}

export const STAGE_ORDER: OpportunityStage[] = [
  'new_enquiry',
  'call1_scheduled',
  'qualified',
  'call2_scheduled',
  'proposal_agreed',
  'awaiting_deposit',
  'deposit_paid',
  'onboarding_scheduled',
  'onboarding_complete',
  'production',
  'installation',
  'complete',
  'lost',
]

/** Pipeline columns shown on the board (excludes 'lost' — shown separately) */
export const PIPELINE_STAGES: OpportunityStage[] = STAGE_ORDER.filter(s => s !== 'lost')

export const LOST_REASONS: { value: string; label: string }[] = [
  { value: 'not_qualified', label: 'Not Qualified' },
  { value: 'price',         label: 'Price' },
  { value: 'timing',        label: 'Timing' },
  { value: 'no_response',   label: 'No Response' },
  { value: 'cancelled',     label: 'Cancelled' },
  { value: 'competitor',    label: 'Competitor' },
]
