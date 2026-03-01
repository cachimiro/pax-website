import type { OpportunityStage } from './types'

export interface StageConfig {
  label: string
  color: string       // Tailwind bg class
  textColor: string   // Tailwind text class
  dotColor: string    // Tailwind bg class for status dot
  description: string // What this stage means and what happens automatically
}

export const STAGES: Record<OpportunityStage, StageConfig> = {
  new_enquiry:          { label: 'New Enquiry',          color: 'bg-blue-50',    textColor: 'text-blue-700',    dotColor: 'bg-blue-500',    description: 'Lead just came in. Auto-sends enquiry confirmation. Task created to attempt first call.' },
  call1_scheduled:      { label: 'Call 1 Scheduled',     color: 'bg-blue-50',    textColor: 'text-blue-600',    dotColor: 'bg-blue-400',    description: 'Discovery call booked. Auto-sends reminder before the call. Calendar event created.' },
  qualified:            { label: 'Qualified',            color: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500', description: 'Lead is a good fit. Task created to schedule the design follow-up call.' },
  call2_scheduled:      { label: 'Call 2 Scheduled',     color: 'bg-emerald-50', textColor: 'text-emerald-600', dotColor: 'bg-emerald-400', description: 'Design call booked to present options. Auto-sends Call 2 invite.' },
  proposal_agreed:      { label: 'Proposal Agreed',      color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-400',   description: 'Client agreed to the proposal. Ready to request deposit.' },
  awaiting_deposit:     { label: 'Awaiting Deposit',     color: 'bg-orange-50',  textColor: 'text-orange-700',  dotColor: 'bg-orange-500',  description: 'Auto-creates invoice + Stripe payment link. Sends deposit request email with payment link.' },
  deposit_paid:         { label: 'Deposit Paid',         color: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-600', description: 'Payment received. Task created to schedule onboarding visit.' },
  onboarding_scheduled: { label: 'Onboarding Scheduled', color: 'bg-purple-50',  textColor: 'text-purple-700',  dotColor: 'bg-purple-400',  description: 'Home visit booked for measurements. Auto-sends onboarding invite.' },
  onboarding_complete:  { label: 'Onboarding Complete',  color: 'bg-purple-50',  textColor: 'text-purple-700',  dotColor: 'bg-purple-600',  description: 'Measurements taken, design finalised. Ready for production.' },
  production:           { label: 'Production',           color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-500',   description: 'Wardrobe is being manufactured. Update when ready for installation.' },
  installation:         { label: 'Installation',         color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-600',   description: 'Installation scheduled or in progress.' },
  complete:             { label: 'Complete',             color: 'bg-emerald-50', textColor: 'text-emerald-800', dotColor: 'bg-emerald-700', description: 'Project delivered. Auto-sends review request after completion.' },
  lost:                 { label: 'Lost',                 color: 'bg-red-50',     textColor: 'text-red-700',     dotColor: 'bg-red-400',     description: 'Deal did not proceed. Select a reason to help track patterns.' },
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
