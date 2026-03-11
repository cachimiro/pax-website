import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, STAGE_TARGETS, safeParseAIJson } from '@/lib/crm/ai-context'

export const maxDuration = 60

const CACHE_KEY = 'pipeline_health_report'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const forceRefresh = body?.force === true

  // Serve from cache if fresh — avoids repeated slow OpenAI calls
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('ai_insights')
      .select('value, computed_at')
      .eq('key', CACHE_KEY)
      .maybeSingle()

    if (cached?.value && cached.computed_at) {
      const age = Date.now() - new Date(cached.computed_at).getTime()
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({ ...(cached.value as object), _cached: true })
      }
    }
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Run all DB queries in parallel — keep selects minimal to reduce latency
  const [activeOpps, recentOpps, stageLog, tasks, bookings, newLeads] = await Promise.all([
    supabase
      .from('opportunities')
      .select('id, stage, value_estimate, updated_at, lead:leads(id, name)')
      .not('stage', 'in', '("lost","complete")')
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('opportunities')
      .select('id, stage, value_estimate, lost_reason, updated_at')
      .in('stage', ['complete', 'lost'])
      .gte('updated_at', twoWeeksAgo.toISOString())
      .limit(40),
    supabase
      .from('stage_log')
      .select('from_stage, to_stage, changed_at')
      .gte('changed_at', weekAgo.toISOString())
      .order('changed_at', { ascending: false })
      .limit(30),
    supabase
      .from('tasks')
      .select('status, due_at')
      .neq('status', 'done')
      .limit(30),
    supabase
      .from('bookings')
      .select('outcome, scheduled_at')
      .gte('scheduled_at', weekAgo.toISOString())
      .limit(20),
    supabase
      .from('leads')
      .select('id, created_at')
      .gte('created_at', twoWeeksAgo.toISOString()),
  ])

  // Derive won/lost/prior from the single recentOpps query
  const allRecent = recentOpps.data ?? []
  const wonOpps = { data: allRecent.filter((o) => o.stage === 'complete' && new Date(o.updated_at) >= weekAgo) }
  const lostOpps = { data: allRecent.filter((o) => o.stage === 'lost' && new Date(o.updated_at) >= weekAgo) }
  const priorWon = { data: allRecent.filter((o) => o.stage === 'complete' && new Date(o.updated_at) < weekAgo) }
  const priorLost = { data: allRecent.filter((o) => o.stage === 'lost' && new Date(o.updated_at) < weekAgo) }
  const newLeadsData = (newLeads.data ?? []).filter((l) => new Date(l.created_at) >= weekAgo)
  const priorLeadsData = (newLeads.data ?? []).filter((l) => new Date(l.created_at) < weekAgo)

  const active = activeOpps.data ?? []
  const won = wonOpps.data
  const lost = lostOpps.data
  const transitions = stageLog.data ?? []
  const openTasks = tasks.data ?? []
  const recentBookings = bookings.data ?? []

  const totalValue = active.reduce((s: number, o: any) => s + (o.value_estimate ?? 0), 0)
  const wonValue = won.reduce((s: number, o: any) => s + (o.value_estimate ?? 0), 0)
  const overdueTasks = openTasks.filter((t: any) => t.due_at && new Date(t.due_at) < now)
  const noShows = recentBookings.filter((b: any) => b.outcome === 'no_show')

  // Stage distribution
  const stageCounts: Record<string, { count: number; totalDays: number }> = {}
  for (const o of active) {
    const stage = (o.stage as string).replace(/_/g, ' ')
    const days = Math.round((now.getTime() - new Date(o.updated_at).getTime()) / 86400000)
    if (!stageCounts[stage]) stageCounts[stage] = { count: 0, totalDays: 0 }
    stageCounts[stage].count++
    stageCounts[stage].totalDays += days
  }

  const stageDistribution = Object.entries(stageCounts)
    .map(([stage, { count, totalDays }]) => `${stage}: ${count} opps, avg ${Math.round(totalDays / count)}d`)
    .join('; ')

  // Lost reasons
  const lostReasons: Record<string, number> = {}
  for (const o of lost) {
    const reason = (o.lost_reason as string) ?? 'unknown'
    lostReasons[reason] = (lostReasons[reason] ?? 0) + 1
  }
  const topLostReason = Object.entries(lostReasons).sort((a, b) => b[1] - a[1])[0]

  // Fitting summary — single query
  const { data: fittingJobsData } = await supabase
    .from('fitting_jobs')
    .select('status')
    .not('status', 'in', '("cancelled","approved")')
    .limit(50)
  const fittingJobs = { data: fittingJobsData }
  const openBoardJobs = { data: (fittingJobsData ?? []).filter((j) => j.status === 'open_board') }

  const fittingData = fittingJobs.data ?? []
  const offeredJobs = fittingData.filter((j: { status: string }) => j.status === 'offered')
  const boardJobs = openBoardJobs.data ?? []
  const pendingSignoffs = fittingData.filter((j: { status: string }) => j.status === 'completed' || j.status === 'signed_off')

  const fittingSummary = [
    offeredJobs.length > 0 ? `${offeredJobs.length} jobs offered (awaiting fitter response)` : '',
    boardJobs.length > 0 ? `${boardJobs.length} jobs on open board (need fitter)` : '',
    pendingSignoffs.length > 0 ? `${pendingSignoffs.length} jobs awaiting sign-off/approval` : '',
  ].filter(Boolean).join('; ') || 'No fitting issues'

  const openai = getOpenAI()

  // Compact context — full stage descriptions not needed for health analysis
  const compactContext = `PaxBespoke: premium bespoke IKEA Pax wardrobes, UK-wide. Avg project £2k–£8k+.
Packages: Budget (remote), Standard (site visit), Select (white-glove).
Key stages: new_enquiry → call1_scheduled → qualified → design_created → quote_sent → [visit] → fitting_proposed → deposit_paid → fitting_confirmed → fitter_assigned → fitting_complete → complete. Also: on_hold, lost.
${STAGE_TARGETS}`

  const systemPrompt = `You are a pipeline analyst for PaxBespoke. Produce a weekly pipeline health report.

${compactContext}

Respond with ONLY valid JSON, no markdown:
{
  "health_score": <0-100>,
  "health_label": "healthy|attention_needed|at_risk",
  "executive_summary": "<2-3 sentence overview>",
  "metrics": [
    { "label": "<name>", "current": "<value>", "prior": "<prior week value>", "trend": "up|down|flat", "insight": "<1 sentence>" }
  ],
  "bottlenecks": [
    { "stage": "<stage name>", "count": <number>, "avg_days": <number>, "recommendation": "<action>" }
  ],
  "at_risk_deals": [
    { "lead_name": "<name>", "lead_id": "<id>", "stage": "<stage>", "days_stuck": <number>, "risk_reason": "<why>", "suggested_action": "<what to do>" }
  ],
  "win_loss": {
    "won": <number>,
    "lost": <number>,
    "win_rate": <percentage 0-100>,
    "top_lost_reason": "<reason or 'N/A'>",
    "insight": "<1 sentence>"
  },
  "recommendations": [
    { "priority": "high|medium", "action": "<specific action>", "expected_impact": "<what it achieves>" }
  ]
}

Rules:
- health_score: 80+ = healthy, 50-79 = attention_needed, <50 = at_risk
- metrics: 3-5 key metrics with week-over-week comparison
- bottlenecks: only stages with avg_days above target (flag max 2)
- at_risk_deals: max 3, highest risk first
- recommendations: max 3, most impactful first
- Be specific and actionable, not generic`

  const userPrompt = `PIPELINE THIS WEEK:
Active: ${active.length} opportunities, total value £${totalValue.toLocaleString('en-GB')}
Stage distribution: ${stageDistribution || 'Empty'}

WON THIS WEEK: ${won.length} deals, £${wonValue.toLocaleString('en-GB')}
LOST THIS WEEK: ${lost.length} deals${topLostReason ? `, top reason: ${topLostReason[0]} (${topLostReason[1]}x)` : ''}
PRIOR WEEK: ${priorWon.data.length} won, ${priorLost.data.length} lost

STAGE TRANSITIONS (7d): ${transitions.length} moves${transitions.length > 0 ? ': ' + transitions.slice(0, 8).map((t: any) => `${t.from_stage ?? 'new'} → ${t.to_stage}`).join(', ') : ''}

NEW LEADS: ${newLeadsData.length} this week vs ${priorLeadsData.length} prior week

TASKS: ${openTasks.length} open, ${overdueTasks.length} overdue
BOOKINGS: ${recentBookings.length} this week, ${noShows.length} no-shows
FITTINGS: ${fittingSummary}

AT-RISK CANDIDATES (stuck longest):
${active
  .map((o: any) => ({
    name: (o.lead as any)?.name ?? 'Unknown',
    id: (o.lead as any)?.id ?? o.id,
    stage: o.stage,
    days: Math.round((now.getTime() - new Date(o.updated_at).getTime()) / 86400000),
  }))
  .sort((a: any, b: any) => b.days - a.days)
  .slice(0, 5)
  .map((o: any) => `${o.name} (${o.stage}, ${o.days}d, id:${o.id})`)
  .join('\n') || 'None'}

Generate the weekly pipeline health report.`

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 700,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw)
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })
    result.period_start = weekAgo.toISOString()
    result.period_end = now.toISOString()
    result.generated_at = now.toISOString()

    // Cache result so subsequent requests within 1 hour skip OpenAI
    await supabase
      .from('ai_insights')
      .upsert({ key: CACHE_KEY, value: result, computed_at: now.toISOString() }, { onConflict: 'key' })
      .then(() => {}) // non-blocking — ignore errors

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pipeline health check failed'
    console.error('Pipeline health error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
