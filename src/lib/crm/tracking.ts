import type { SupabaseClient } from '@supabase/supabase-js'
import type { OpportunityStage } from './types'

export interface DateRange {
  from: string // ISO date
  to: string   // ISO date
}

export interface TrackingMetrics {
  visitors: number
  uniqueVisitors: number
  enquiries: number
  qualified: number
  call2Done: number
  depositsCount: number
  completedCount: number
  lostCount: number
  totalRevenue: number
  enquiryRate: number
  qualifiedRate: number
  depositRate: number
  visitorToDepositRate: number
  revenuePerVisitor: number
  revenuePerEnquiry: number
  revenuePerQualified: number
  revenuePerDeposit: number
}

export interface SourceMetrics {
  source: string
  visitors: number
  enquiries: number
  qualified: number
  deposits: number
  completed: number
  revenue: number
  enquiryRate: number
  qualifiedRate: number
  depositRate: number
  revenuePerVisitor: number
  revenuePerLead: number
  qualityScore: number
}

export interface PageMetrics {
  page: string
  visitors: number
  enquiries: number
  qualified: number
  deposits: number
  revenue: number
  revenuePerVisitor: number
}

export interface SpeedMetric {
  label: string
  fromStage: string
  toStage: string
  median: number | null
  average: number | null
  target: number
}

export interface DropoffMetric {
  stage: string
  label: string
  entered: number
  dropped: number
  dropRate: number
}

export interface LostReasonMetric {
  reason: string
  count: number
  percentage: number
}

// ─── Core Metrics ────────────────────────────────────────────────────────────

export async function getTrackingMetrics(
  supabase: SupabaseClient,
  range: DateRange
): Promise<TrackingMetrics> {
  // Unique visitors from site_sessions
  const { data: sessions } = await supabase
    .from('site_sessions')
    .select('visitor_id')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const visitorIds = new Set((sessions ?? []).map((s: any) => s.visitor_id))
  const visitors = sessions?.length ?? 0
  const uniqueVisitors = visitorIds.size

  // Leads (enquiries) in range
  const { data: leads } = await supabase
    .from('leads')
    .select('id, traffic_source, landing_page')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const enquiries = leads?.length ?? 0

  // Opportunities in range with stages
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, stage, value_estimate, created_at, lead_id')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const allOpps = opps ?? []
  const qualified = allOpps.filter((o: any) => !['new_enquiry', 'call1_scheduled', 'lost'].includes(o.stage)).length
  const call2Done = allOpps.filter((o: any) => !['new_enquiry', 'call1_scheduled', 'qualified', 'call2_scheduled', 'lost'].includes(o.stage)).length
  const depositsCount = allOpps.filter((o: any) => !['new_enquiry', 'call1_scheduled', 'qualified', 'call2_scheduled', 'proposal_agreed', 'awaiting_deposit', 'lost'].includes(o.stage)).length
  const completedCount = allOpps.filter((o: any) => o.stage === 'complete').length
  const lostCount = allOpps.filter((o: any) => o.stage === 'lost').length
  const totalRevenue = allOpps
    .filter((o: any) => o.stage === 'complete')
    .reduce((sum: number, o: any) => sum + (o.value_estimate ?? 0), 0)

  const uv = uniqueVisitors || 1
  const enq = enquiries || 1
  const qual = qualified || 1
  const dep = depositsCount || 1

  return {
    visitors,
    uniqueVisitors,
    enquiries,
    qualified,
    call2Done,
    depositsCount,
    completedCount,
    lostCount,
    totalRevenue,
    enquiryRate: enquiries / uv * 100,
    qualifiedRate: qualified / enq * 100,
    depositRate: depositsCount / qual * 100,
    visitorToDepositRate: depositsCount / uv * 100,
    revenuePerVisitor: totalRevenue / uv,
    revenuePerEnquiry: totalRevenue / enq,
    revenuePerQualified: totalRevenue / qual,
    revenuePerDeposit: totalRevenue / dep,
  }
}

// ─── Source Metrics ──────────────────────────────────────────────────────────

export async function getSourceMetrics(
  supabase: SupabaseClient,
  range: DateRange
): Promise<SourceMetrics[]> {
  // Visitors by source
  const { data: sessions } = await supabase
    .from('site_sessions')
    .select('visitor_id, utm_source')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  // Leads by source
  const { data: leads } = await supabase
    .from('leads')
    .select('id, traffic_source, visitor_id')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  // Opportunities
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, stage, value_estimate, lead_id')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const allLeads = leads ?? []
  const allOpps = opps ?? []
  const allSessions = sessions ?? []

  // Build lead→source map
  const leadSourceMap = new Map<string, string>()
  allLeads.forEach((l: any) => leadSourceMap.set(l.id, l.traffic_source ?? 'Direct'))

  // Group by source
  const sources = new Set<string>()
  allLeads.forEach((l: any) => sources.add(l.traffic_source ?? 'Direct'))

  // Count visitors per source from sessions
  const sessionsBySource = new Map<string, Set<string>>()
  allSessions.forEach((s: any) => {
    const src = classifyUtmSource(s.utm_source)
    if (!sessionsBySource.has(src)) sessionsBySource.set(src, new Set())
    sessionsBySource.get(src)!.add(s.visitor_id)
  })

  // Ensure all lead sources are represented
  sessionsBySource.forEach((_, src) => sources.add(src))

  return Array.from(sources).map((source) => {
    const sourceLeads = allLeads.filter((l: any) => (l.traffic_source ?? 'Direct') === source)
    const leadIds = new Set(sourceLeads.map((l: any) => l.id))
    const sourceOpps = allOpps.filter((o: any) => leadIds.has(o.lead_id))

    const visitors = sessionsBySource.get(source)?.size ?? 0
    const enquiries = sourceLeads.length
    const qualified = sourceOpps.filter((o: any) => !['new_enquiry', 'call1_scheduled', 'lost'].includes(o.stage)).length
    const deposits = sourceOpps.filter((o: any) => !['new_enquiry', 'call1_scheduled', 'qualified', 'call2_scheduled', 'proposal_agreed', 'awaiting_deposit', 'lost'].includes(o.stage)).length
    const completed = sourceOpps.filter((o: any) => o.stage === 'complete').length
    const revenue = sourceOpps.filter((o: any) => o.stage === 'complete').reduce((s: number, o: any) => s + (o.value_estimate ?? 0), 0)

    const qualRate = enquiries > 0 ? qualified / enquiries * 100 : 0
    const depRate = qualified > 0 ? deposits / qualified * 100 : 0
    const revPerLead = enquiries > 0 ? revenue / enquiries : 0

    // Quality score: 30% qual rate + 30% deposit rate + 40% rev per lead (normalized)
    const qualityScore = Math.round(qualRate * 0.3 + depRate * 0.3 + Math.min(revPerLead / 20, 100) * 0.4)

    return {
      source,
      visitors,
      enquiries,
      qualified,
      deposits,
      completed,
      revenue,
      enquiryRate: visitors > 0 ? enquiries / visitors * 100 : 0,
      qualifiedRate: qualRate,
      depositRate: depRate,
      revenuePerVisitor: visitors > 0 ? revenue / visitors : 0,
      revenuePerLead: revPerLead,
      qualityScore,
    }
  }).sort((a, b) => b.qualityScore - a.qualityScore)
}

// ─── Page Metrics ────────────────────────────────────────────────────────────

export async function getPageMetrics(
  supabase: SupabaseClient,
  range: DateRange
): Promise<PageMetrics[]> {
  const { data: sessions } = await supabase
    .from('site_sessions')
    .select('visitor_id, page_path')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const { data: leads } = await supabase
    .from('leads')
    .select('id, landing_page')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, stage, value_estimate, lead_id')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const allSessions = sessions ?? []
  const allLeads = leads ?? []
  const allOpps = opps ?? []

  // Unique pages
  const pages = new Set<string>()
  allSessions.forEach((s: any) => pages.add(s.page_path))
  allLeads.forEach((l: any) => { if (l.landing_page) pages.add(l.landing_page) })

  return Array.from(pages).map((page) => {
    const pageVisitors = new Set(allSessions.filter((s: any) => s.page_path === page).map((s: any) => s.visitor_id))
    const pageLeads = allLeads.filter((l: any) => l.landing_page === page)
    const leadIds = new Set(pageLeads.map((l: any) => l.id))
    const pageOpps = allOpps.filter((o: any) => leadIds.has(o.lead_id))

    const visitors = pageVisitors.size
    const enquiries = pageLeads.length
    const qualified = pageOpps.filter((o: any) => !['new_enquiry', 'call1_scheduled', 'lost'].includes(o.stage)).length
    const deposits = pageOpps.filter((o: any) => !['new_enquiry', 'call1_scheduled', 'qualified', 'call2_scheduled', 'proposal_agreed', 'awaiting_deposit', 'lost'].includes(o.stage)).length
    const revenue = pageOpps.filter((o: any) => o.stage === 'complete').reduce((s: number, o: any) => s + (o.value_estimate ?? 0), 0)

    return {
      page,
      visitors,
      enquiries,
      qualified,
      deposits,
      revenue,
      revenuePerVisitor: visitors > 0 ? revenue / visitors : 0,
    }
  }).sort((a, b) => b.revenuePerVisitor - a.revenuePerVisitor)
}

// ─── Speed Metrics ───────────────────────────────────────────────────────────

export async function getSpeedMetrics(
  supabase: SupabaseClient,
  range: DateRange
): Promise<SpeedMetric[]> {
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, created_at, call1_completed_at, deposit_paid_at, onboarding_completed_at, completed_at')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const allOpps = (opps ?? []) as any[]

  function computeTimes(getFrom: (o: any) => string | null, getTo: (o: any) => string | null): { median: number | null; average: number | null } {
    const diffs: number[] = []
    allOpps.forEach((o) => {
      const from = getFrom(o)
      const to = getTo(o)
      if (from && to) {
        const diff = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
        if (diff >= 0) diffs.push(diff)
      }
    })
    if (diffs.length === 0) return { median: null, average: null }
    diffs.sort((a, b) => a - b)
    const median = diffs[Math.floor(diffs.length / 2)]
    const average = diffs.reduce((s, d) => s + d, 0) / diffs.length
    return { median: Math.round(median * 10) / 10, average: Math.round(average * 10) / 10 }
  }

  return [
    { label: 'Enquiry → Call 1', fromStage: 'created', toStage: 'call1', target: 2, ...computeTimes((o) => o.created_at, (o) => o.call1_completed_at) },
    { label: 'Call 1 → Deposit', fromStage: 'call1', toStage: 'deposit', target: 10, ...computeTimes((o) => o.call1_completed_at, (o) => o.deposit_paid_at) },
    { label: 'Deposit → Onboarding', fromStage: 'deposit', toStage: 'onboarding', target: 5, ...computeTimes((o) => o.deposit_paid_at, (o) => o.onboarding_completed_at) },
    { label: 'Onboarding → Complete', fromStage: 'onboarding', toStage: 'complete', target: 14, ...computeTimes((o) => o.onboarding_completed_at, (o) => o.completed_at) },
    { label: 'Total: Enquiry → Complete', fromStage: 'created', toStage: 'complete', target: 30, ...computeTimes((o) => o.created_at, (o) => o.completed_at) },
  ]
}

// ─── Drop-off Metrics ────────────────────────────────────────────────────────

export async function getDropoffMetrics(
  supabase: SupabaseClient,
  range: DateRange
): Promise<{ dropoffs: DropoffMetric[]; lostReasons: LostReasonMetric[] }> {
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, stage, lost_reason')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  const allOpps = (opps ?? []) as any[]
  const total = allOpps.length

  const stageOrder: { stage: string; label: string }[] = [
    { stage: 'new_enquiry', label: 'Enquiry' },
    { stage: 'call1_scheduled', label: 'Call 1 Booked' },
    { stage: 'qualified', label: 'Qualified' },
    { stage: 'call2_scheduled', label: 'Call 2 Booked' },
    { stage: 'proposal_agreed', label: 'Proposal Agreed' },
    { stage: 'deposit_paid', label: 'Deposit Paid' },
    { stage: 'onboarding_complete', label: 'Onboarding Done' },
    { stage: 'complete', label: 'Complete' },
  ]

  // Count how many reached each stage or beyond
  const stageIndex: Record<string, number> = {}
  stageOrder.forEach((s, i) => { stageIndex[s.stage] = i })

  function reachedStage(oppStage: string, targetStage: string): boolean {
    const oppIdx = stageIndex[oppStage] ?? -1
    const targetIdx = stageIndex[targetStage] ?? 999
    // Special stages that map to indices
    const stageMap: Record<string, number> = {
      awaiting_deposit: 4,
      onboarding_scheduled: 5,
      production: 7,
      installation: 7,
    }
    const effectiveIdx = stageMap[oppStage] ?? oppIdx
    return effectiveIdx >= targetIdx || oppStage === targetStage
  }

  const dropoffs: DropoffMetric[] = []
  let prevCount = total

  for (const { stage, label } of stageOrder) {
    const reached = allOpps.filter((o: any) => reachedStage(o.stage, stage) || o.stage === 'lost').length
    // For lost, they didn't reach — subtract
    const actualReached = allOpps.filter((o: any) => reachedStage(o.stage, stage) && o.stage !== 'lost').length
    const dropped = prevCount - actualReached
    dropoffs.push({
      stage,
      label,
      entered: actualReached,
      dropped: dropped > 0 ? dropped : 0,
      dropRate: prevCount > 0 ? (dropped > 0 ? dropped / prevCount * 100 : 0) : 0,
    })
    prevCount = actualReached
  }

  // Lost reasons
  const lostOpps = allOpps.filter((o: any) => o.stage === 'lost')
  const reasonCounts = new Map<string, number>()
  lostOpps.forEach((o: any) => {
    const r = o.lost_reason ?? 'unknown'
    reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1)
  })

  const lostReasons: LostReasonMetric[] = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: lostOpps.length > 0 ? count / lostOpps.length * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return { dropoffs, lostReasons }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyUtmSource(utmSource: string | null): string {
  if (!utmSource) return 'Direct'
  const src = utmSource.toLowerCase()
  if (src.includes('google')) return 'Google Ads'
  if (src.includes('facebook') || src.includes('fb')) return 'Facebook'
  if (src.includes('instagram') || src.includes('ig')) return 'Instagram'
  return utmSource
}
