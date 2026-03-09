import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Business Context ────────────────────────────────────────────────────────

export const BUSINESS_CONTEXT = `PaxBespoke is a premium bespoke IKEA Pax wardrobe company operating UK-wide.
- Service: design consultations, 3D renders, custom fitting, professional installation
- Packages: Budget (remote only), Standard (includes site visit), Select (full white-glove)
- Average project value: £2,000–£8,000+
- Entry routes: Online consultation (video call), Video call (Meet 1), Direct visit (site visit first)
- Deposit: typically 30% of quote to secure fitting slot`

// ─── Pipeline Definition ─────────────────────────────────────────────────────

export const PIPELINE_STAGES = `Pipeline stages (24 stages, grouped):

NEW:
  new_enquiry — Lead just came in. Auto-sends enquiry confirmation.

MEET 1 (Discovery):
  call1_scheduled — Discovery call booked. Calendar + Meet link created. Reminders auto-sent.
  qualified — Lead is a good fit after screening.
  meet1_completed — First consultation done. Task: create 3D design.

DESIGN & QUOTE:
  design_created — 3D design ready. Next: create and send quote.
  quote_sent — Quote emailed with design link. Auto follow-ups at 48h and 5 days.

VISIT (Standard/Select packages only):
  visit_required — Site visit needed. Auto-sends booking invite.
  visit_scheduled — Visit date booked. Confirmation + 24h reminder sent.
  visit_completed — Visit done. Task: revise design after visit.

MEET 2 (Revision, optional):
  call2_scheduled — Revision call booked to discuss design changes.
  meet2_completed — Revision done. Updated quote sent.

FITTING:
  fitting_proposed — Fitting date options sent. Client selects via email link.
  proposal_agreed — Client agreed to proceed. Ready for deposit.

DEPOSIT:
  awaiting_deposit — Invoice + Stripe payment link auto-created. Follow-ups if unpaid.
  deposit_paid — Payment received. Fitting slot confirmed.
  fitting_confirmed — Fitting date locked. 48h reminder auto-sent.

ON SITE:
  fitter_assigned — Fitter assigned or offer accepted. Job pack sent.
  fitting_in_progress — Fitter is on-site working.

CLOSE:
  fitting_complete — Fitter marked job done. Awaiting sign-off.
  sign_off_pending — Sign-off sent to customer.
  complete — Job approved, project delivered. Auto-sends review request.

PAUSED/CLOSED:
  on_hold — Client needs time. Nurture emails every 2 weeks.
  lost — Deal did not proceed.
  closed_not_interested — Client clicked "Not Interested" in email.

BRANCHING RULES:
- Budget package: skips visit stages (visit_required → visit_completed)
- Standard/Select: goes through visit stages
- Meet 2 is optional — only if design revisions needed
- Entry route "direct_visit" starts with visit, then design, then quote`

export const STAGE_TARGETS = `Target timelines per stage:
- new_enquiry: respond within 1 hour, schedule Meet 1 within 1 day
- call1_scheduled: complete within 3 days
- qualified → meet1_completed: same day as call
- design_created: within 3 working days of Meet 1
- quote_sent: within 1 day of design completion
- quote follow-up: 48h and 5 days if no response
- visit_required: schedule within 5 days
- visit_scheduled: complete within 7 days
- call2_scheduled: within 3 days of visit/design revision
- fitting_proposed: within 2 days of final quote
- awaiting_deposit: follow up within 3 days
- deposit_paid → fitting_confirmed: same day
- fitting_confirmed → fitter_assigned: within 2 days
- fitting_complete → sign_off: within 1 day`

// ─── Safe JSON Parsing ───────────────────────────────────────────────────────

export function safeParseAIJson(raw: string): Record<string, unknown> | null {
  // Try direct parse first
  try {
    return JSON.parse(raw)
  } catch {
    // Extract JSON from markdown code blocks or surrounding text
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

// ─── Lead/Opportunity Context Builder ────────────────────────────────────────

export interface EnrichedContext {
  lead: {
    name: string
    email: string | null
    phone: string | null
    postcode: string | null
    project_type: string | null
    budget_band: string | null
    source: string | null
    notes: string | null
    status: string
    created_at: string
    opted_out: boolean
    snoozed_until: string | null
  }
  opportunity: {
    id: string
    stage: string
    value_estimate: number | null
    entry_route: string | null
    package_complexity: string | null
    visit_required: boolean
    created_at: string
    updated_at: string
    days_in_pipeline: number
    days_in_stage: number
  } | null
  visits: { scheduled_at: string; status: string; notes: string | null }[]
  designs: { version: number; file_url: string | null; planner_link: string | null; created_at: string }[]
  quotes: { amount: number; deposit_amount: number | null; status: string; created_at: string }[]
  fittings: { proposed_dates: string[] | null; confirmed_date: string | null; status: string }[]
  bookings: { type: string; scheduled_at: string; outcome: string; meet_link: string | null }[]
  tasks: { type: string; status: string; due_at: string | null; description: string | null }[]
  messages: { channel: string; template: string | null; status: string; sent_at: string }[]
  stageLog: { from_stage: string | null; to_stage: string; changed_at: string; notes: string | null }[]
}

/**
 * Fetch all related data for a lead/opportunity to pass to AI endpoints.
 * Uses maybeSingle() and handles empty results gracefully.
 */
export async function buildEnrichedContext(
  supabase: SupabaseClient,
  leadId: string,
  opportunityId?: string
): Promise<EnrichedContext> {
  const now = new Date()

  // Lead
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) throw new Error(`Lead ${leadId} not found`)

  // Opportunity
  let opp = null
  if (opportunityId) {
    const { data } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single()
    opp = data
  } else {
    const { data } = await supabase
      .from('opportunities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    opp = data
  }

  const oppId = opp?.id ?? opportunityId

  // Parallel fetches for related entities
  const [visitsRes, designsRes, quotesRes, fittingsRes, bookingsRes, tasksRes, messagesRes, stageLogRes] = await Promise.all([
    oppId ? supabase.from('visits').select('scheduled_at, status, notes').eq('opportunity_id', oppId).order('created_at', { ascending: false }).limit(5) : { data: [] },
    oppId ? supabase.from('designs').select('version, file_url, planner_link, created_at').eq('opportunity_id', oppId).order('created_at', { ascending: false }).limit(5) : { data: [] },
    oppId ? supabase.from('quotes').select('amount, deposit_amount, status, created_at').eq('opportunity_id', oppId).order('created_at', { ascending: false }).limit(5) : { data: [] },
    oppId ? supabase.from('fitting_slots').select('proposed_dates, confirmed_date, status').eq('opportunity_id', oppId).order('created_at', { ascending: false }).limit(3) : { data: [] },
    oppId ? supabase.from('bookings').select('type, scheduled_at, outcome, meet_link').eq('opportunity_id', oppId).order('scheduled_at', { ascending: false }).limit(10) : { data: [] },
    oppId ? supabase.from('tasks').select('type, status, due_at, description').eq('opportunity_id', oppId).order('due_at', { ascending: false }).limit(10) : { data: [] },
    supabase.from('message_logs').select('channel, template, status, sent_at').eq('lead_id', leadId).order('sent_at', { ascending: false }).limit(15),
    oppId ? supabase.from('stage_log').select('from_stage, to_stage, changed_at, notes').eq('opportunity_id', oppId).order('changed_at', { ascending: false }).limit(15) : { data: [] },
  ])

  return {
    lead: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      postcode: lead.postcode,
      project_type: lead.project_type,
      budget_band: lead.budget_band,
      source: lead.source,
      notes: lead.notes,
      status: lead.status,
      created_at: lead.created_at,
      opted_out: lead.opted_out ?? false,
      snoozed_until: lead.snoozed_until,
    },
    opportunity: opp ? {
      id: opp.id,
      stage: opp.stage,
      value_estimate: opp.value_estimate,
      entry_route: opp.entry_route,
      package_complexity: opp.package_complexity,
      visit_required: opp.visit_required ?? false,
      created_at: opp.created_at,
      updated_at: opp.updated_at,
      days_in_pipeline: Math.round((now.getTime() - new Date(opp.created_at).getTime()) / 86400000),
      days_in_stage: Math.round((now.getTime() - new Date(opp.updated_at).getTime()) / 86400000),
    } : null,
    visits: (visitsRes.data ?? []) as EnrichedContext['visits'],
    designs: (designsRes.data ?? []) as EnrichedContext['designs'],
    quotes: (quotesRes.data ?? []) as EnrichedContext['quotes'],
    fittings: (fittingsRes.data ?? []) as EnrichedContext['fittings'],
    bookings: (bookingsRes.data ?? []) as EnrichedContext['bookings'],
    tasks: (tasksRes.data ?? []) as EnrichedContext['tasks'],
    messages: (messagesRes.data ?? []) as EnrichedContext['messages'],
    stageLog: (stageLogRes.data ?? []) as EnrichedContext['stageLog'],
  }
}

/**
 * Format enriched context into a concise text block for AI prompts.
 * Truncates to keep token usage reasonable.
 */
export function formatContextForPrompt(ctx: EnrichedContext): string {
  const parts: string[] = []

  // Lead info
  parts.push(`Lead: ${ctx.lead.name}`)
  parts.push(`Status: ${ctx.lead.status}`)
  parts.push(`Created: ${new Date(ctx.lead.created_at).toLocaleDateString('en-GB')}`)
  if (ctx.lead.project_type) parts.push(`Project: ${ctx.lead.project_type}`)
  if (ctx.lead.budget_band) parts.push(`Budget: ${ctx.lead.budget_band}`)
  if (ctx.lead.source) parts.push(`Source: ${ctx.lead.source}`)
  if (ctx.lead.postcode) parts.push(`Location: ${ctx.lead.postcode}`)
  if (ctx.lead.opted_out) parts.push('⚠ Lead has opted out of communications')
  if (ctx.lead.snoozed_until) parts.push(`Snoozed until: ${new Date(ctx.lead.snoozed_until).toLocaleDateString('en-GB')}`)

  // Opportunity
  if (ctx.opportunity) {
    const o = ctx.opportunity
    parts.push('')
    parts.push(`Stage: ${o.stage.replace(/_/g, ' ')}`)
    parts.push(`Days in pipeline: ${o.days_in_pipeline}`)
    parts.push(`Days in current stage: ${o.days_in_stage}`)
    if (o.value_estimate) parts.push(`Value: £${o.value_estimate.toLocaleString('en-GB')}`)
    if (o.entry_route) parts.push(`Entry route: ${o.entry_route.replace(/_/g, ' ')}`)
    if (o.package_complexity) parts.push(`Package: ${o.package_complexity}`)
    if (o.visit_required) parts.push('Visit required: yes')
  }

  // Visits
  if (ctx.visits.length > 0) {
    parts.push('')
    parts.push(`Visits: ${ctx.visits.map(v => `${v.status} (${new Date(v.scheduled_at).toLocaleDateString('en-GB')})`).join(', ')}`)
  }

  // Designs
  if (ctx.designs.length > 0) {
    parts.push(`Designs: ${ctx.designs.length} version(s), latest: ${new Date(ctx.designs[0].created_at).toLocaleDateString('en-GB')}`)
  }

  // Quotes
  if (ctx.quotes.length > 0) {
    const q = ctx.quotes[0]
    parts.push(`Latest quote: £${Number(q.amount).toLocaleString('en-GB')} (${q.status})${q.deposit_amount ? `, deposit £${Number(q.deposit_amount).toLocaleString('en-GB')}` : ''}`)
  }

  // Fittings
  if (ctx.fittings.length > 0) {
    const f = ctx.fittings[0]
    if (f.confirmed_date) {
      parts.push(`Fitting: confirmed ${new Date(f.confirmed_date).toLocaleDateString('en-GB')}`)
    } else if (f.proposed_dates?.length) {
      parts.push(`Fitting: ${f.proposed_dates.length} dates proposed, awaiting selection`)
    }
  }

  // Bookings
  if (ctx.bookings.length > 0) {
    parts.push('')
    parts.push(`Bookings: ${ctx.bookings.map(b => `${b.type} — ${b.outcome} (${new Date(b.scheduled_at).toLocaleDateString('en-GB')})`).join(', ')}`)
  }

  // Tasks
  const openTasks = ctx.tasks.filter(t => t.status !== 'done')
  if (openTasks.length > 0) {
    parts.push(`Open tasks: ${openTasks.map(t => `${t.type} (${t.status})`).join(', ')}`)
  }

  // Messages
  if (ctx.messages.length > 0) {
    parts.push(`Messages sent: ${ctx.messages.length} total, recent: ${ctx.messages.slice(0, 5).map(m => `${m.channel} ${m.template ?? 'custom'} — ${m.status}`).join(', ')}`)
  }

  // Stage log
  if (ctx.stageLog.length > 0) {
    parts.push('')
    parts.push(`Stage history: ${ctx.stageLog.slice(0, 8).map(s => `${s.from_stage ?? 'new'} → ${s.to_stage} (${new Date(s.changed_at).toLocaleDateString('en-GB')})`).join(', ')}`)
  }

  return parts.join('\n')
}
