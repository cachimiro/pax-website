import type { OpportunityStage } from './types'

export interface StageConfig {
  label: string
  color: string       // Tailwind bg class
  textColor: string   // Tailwind text class
  dotColor: string    // Tailwind bg class for status dot
  description: string // What this stage means and what happens automatically
  group: string       // Pipeline board column group
}

export const STAGES: Record<OpportunityStage, StageConfig> = {
  // ─── New ───────────────────────────────────────────────────────────────────
  new_enquiry:          { label: 'New Enquiry',          color: 'bg-blue-50',    textColor: 'text-blue-700',    dotColor: 'bg-blue-500',    group: 'new',      description: 'Lead just came in. Auto-sends enquiry confirmation. Task created to attempt first call.' },

  // ─── Meet 1 ────────────────────────────────────────────────────────────────
  call1_scheduled:      { label: 'Meet 1 Scheduled',     color: 'bg-blue-50',    textColor: 'text-blue-600',    dotColor: 'bg-blue-400',    group: 'meet1',    description: 'Discovery call booked. Auto-sends reminder before the call. Calendar event + Meet link created.' },
  qualified:            { label: 'Qualified',            color: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500', group: 'meet1',    description: 'Lead is a good fit after initial screening. Ready for Meet 1.' },
  meet1_completed:      { label: 'Meet 1 Completed',     color: 'bg-emerald-50', textColor: 'text-emerald-600', dotColor: 'bg-emerald-400', group: 'meet1',    description: 'First consultation done. Task created: "Create 3D design". Client receives thank-you email.' },

  // ─── Design & Quote ────────────────────────────────────────────────────────
  design_created:       { label: 'Design Created',       color: 'bg-indigo-50',  textColor: 'text-indigo-700',  dotColor: 'bg-indigo-500',  group: 'design',   description: 'Seller has created the 3D design. Next step: create and send the quote.' },
  quote_sent:           { label: 'Quote Sent',           color: 'bg-indigo-50',  textColor: 'text-indigo-600',  dotColor: 'bg-indigo-400',  group: 'design',   description: 'Quote emailed to client with design link. Auto follow-ups at 48h and 5 days if no response. Client can click "Proceed", "Not Interested", or "Need More Time".' },

  // ─── Visit (Standard/Select only) ──────────────────────────────────────────
  visit_required:       { label: 'Visit Required',       color: 'bg-violet-50',  textColor: 'text-violet-700',  dotColor: 'bg-violet-500',  group: 'visit',    description: 'Site visit needed (Standard/Select package). Auto-sends "Book your visit" email with booking link.' },
  visit_scheduled:      { label: 'Visit Scheduled',      color: 'bg-violet-50',  textColor: 'text-violet-600',  dotColor: 'bg-violet-400',  group: 'visit',    description: 'Visit date booked. Auto-sends confirmation + 24h reminder. Calendar event created.' },
  visit_completed:      { label: 'Visit Completed',      color: 'bg-violet-50',  textColor: 'text-violet-500',  dotColor: 'bg-violet-300',  group: 'visit',    description: 'Visit done. Task created: "Revise design after visit". Client receives thank-you email.' },

  // ─── Meet 2 (optional) ─────────────────────────────────────────────────────
  call2_scheduled:      { label: 'Meet 2 Scheduled',     color: 'bg-cyan-50',    textColor: 'text-cyan-700',    dotColor: 'bg-cyan-500',    group: 'meet2',    description: 'Revision call booked to discuss design changes. Auto-sends Meet 2 invite + reminder.' },
  meet2_completed:      { label: 'Meet 2 Completed',     color: 'bg-cyan-50',    textColor: 'text-cyan-600',    dotColor: 'bg-cyan-400',    group: 'meet2',    description: 'Revision call done. Updated quote sent. Ready for fitting proposal.' },

  // ─── Fitting ───────────────────────────────────────────────────────────────
  fitting_proposed:     { label: 'Fitting Proposed',     color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-500',   group: 'fitting',  description: 'Fitting date options sent to client. Auto follow-up at 48h. Client selects a date via email link.' },
  proposal_agreed:      { label: 'Proposal Agreed',      color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-400',   group: 'fitting',  description: 'Client agreed to proceed. Ready to request deposit.' },

  // ─── Deposit ───────────────────────────────────────────────────────────────
  awaiting_deposit:     { label: 'Awaiting Deposit',     color: 'bg-orange-50',  textColor: 'text-orange-700',  dotColor: 'bg-orange-500',  group: 'deposit',  description: 'Auto-creates invoice + Stripe payment link. Sends deposit request email. Follow-ups if unpaid.' },
  deposit_paid:         { label: 'Deposit Paid',         color: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-600', group: 'deposit',  description: 'Payment received via Stripe. Fitting slot auto-confirmed. Confirmation email sent.' },
  fitting_confirmed:    { label: 'Fitting Confirmed',    color: 'bg-emerald-50', textColor: 'text-emerald-600', dotColor: 'bg-emerald-500', group: 'deposit',  description: 'Fitting date locked. 48h reminder auto-sent. Ready for ops handoff.' },

  // ─── Operations ────────────────────────────────────────────────────────────
  onboarding_scheduled: { label: 'Ops Handoff',          color: 'bg-purple-50',  textColor: 'text-purple-700',  dotColor: 'bg-purple-400',  group: 'ops',      description: 'Handed off to operations. All sales data (design, quote, fitting date, deposit) transferred.' },
  onboarding_complete:  { label: 'Onboarding Complete',  color: 'bg-purple-50',  textColor: 'text-purple-700',  dotColor: 'bg-purple-600', group: 'ops',      description: 'Measurements taken, design finalised. Ready for production.' },
  production:           { label: 'Production',           color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-500',   group: 'ops',      description: 'Wardrobe is being manufactured. Update when ready for installation.' },
  installation:         { label: 'Installation',         color: 'bg-amber-50',   textColor: 'text-amber-700',   dotColor: 'bg-amber-600',   group: 'ops',      description: 'Installation scheduled or in progress.' },
  complete:             { label: 'Complete',             color: 'bg-emerald-50', textColor: 'text-emerald-800', dotColor: 'bg-emerald-700', group: 'ops',      description: 'Project delivered. Auto-sends review request after completion.' },

  // ─── Paused / Closed ──────────────────────────────────────────────────────
  on_hold:              { label: 'On Hold',              color: 'bg-slate-50',   textColor: 'text-slate-600',   dotColor: 'bg-slate-400',   group: 'paused',   description: 'Client needs more time. Pressure follow-ups stopped. Nurture email every 2 weeks. Auto-closes after 3 unanswered nurtures.' },
  lost:                 { label: 'Lost',                 color: 'bg-red-50',     textColor: 'text-red-700',     dotColor: 'bg-red-400',     group: 'closed',   description: 'Deal did not proceed. Select a reason to help track patterns.' },
  closed_not_interested:{ label: 'Not Interested',       color: 'bg-red-50',     textColor: 'text-red-600',     dotColor: 'bg-red-300',     group: 'closed',   description: 'Client clicked "Not Interested" in a follow-up email. All sequences stopped.' },
}

export const STAGE_ORDER: OpportunityStage[] = [
  'new_enquiry',
  'call1_scheduled',
  'qualified',
  'meet1_completed',
  'design_created',
  'quote_sent',
  'visit_required',
  'visit_scheduled',
  'visit_completed',
  'call2_scheduled',
  'meet2_completed',
  'fitting_proposed',
  'proposal_agreed',
  'awaiting_deposit',
  'deposit_paid',
  'fitting_confirmed',
  'onboarding_scheduled',
  'onboarding_complete',
  'production',
  'installation',
  'complete',
  'on_hold',
  'lost',
  'closed_not_interested',
]

/** Pipeline board column groups — each group becomes one visual column */
export interface PipelineGroup {
  key: string
  label: string
  stages: OpportunityStage[]
  color: string
}

export const PIPELINE_GROUPS: PipelineGroup[] = [
  { key: 'new',     label: 'New',            stages: ['new_enquiry'],                                                  color: 'bg-blue-500' },
  { key: 'meet1',   label: 'Meet 1',         stages: ['call1_scheduled', 'qualified', 'meet1_completed'],              color: 'bg-emerald-500' },
  { key: 'design',  label: 'Design & Quote', stages: ['design_created', 'quote_sent'],                                color: 'bg-indigo-500' },
  { key: 'visit',   label: 'Visit',          stages: ['visit_required', 'visit_scheduled', 'visit_completed'],         color: 'bg-violet-500' },
  { key: 'meet2',   label: 'Meet 2',         stages: ['call2_scheduled', 'meet2_completed'],                           color: 'bg-cyan-500' },
  { key: 'fitting', label: 'Fitting',        stages: ['fitting_proposed', 'proposal_agreed'],                          color: 'bg-amber-500' },
  { key: 'deposit', label: 'Deposit',        stages: ['awaiting_deposit', 'deposit_paid', 'fitting_confirmed'],        color: 'bg-orange-500' },
  { key: 'ops',     label: 'Operations',     stages: ['onboarding_scheduled', 'onboarding_complete', 'production', 'installation', 'complete'], color: 'bg-purple-500' },
  { key: 'paused',  label: 'On Hold',        stages: ['on_hold'],                                                     color: 'bg-slate-400' },
  { key: 'closed',  label: 'Closed',         stages: ['lost', 'closed_not_interested'],                               color: 'bg-red-400' },
]

/** Flat list of active pipeline stages (excludes closed) for the board */
export const PIPELINE_STAGES: OpportunityStage[] = STAGE_ORDER.filter(
  s => s !== 'lost' && s !== 'closed_not_interested'
)

export const LOST_REASONS: { value: string; label: string }[] = [
  { value: 'not_qualified', label: 'Not Qualified' },
  { value: 'price',         label: 'Price' },
  { value: 'timing',        label: 'Timing' },
  { value: 'no_response',   label: 'No Response' },
  { value: 'cancelled',     label: 'Cancelled' },
  { value: 'competitor',    label: 'Competitor' },
  { value: 'not_interested', label: 'Not Interested (via email)' },
]
