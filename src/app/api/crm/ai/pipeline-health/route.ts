import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [activeOpps, wonOpps, lostOpps, priorWon, priorLost, stageLog, tasks, bookings, newLeads, priorLeads] = await Promise.all([
    supabase
      .from('opportunities')
      .select('id, stage, value_estimate, updated_at, created_at, lead:leads(id, name, project_type, budget_band)')
      .not('stage', 'in', '("lost","complete")')
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('opportunities')
      .select('id, stage, value_estimate, updated_at, lead:leads(name)')
      .eq('stage', 'complete')
      .gte('updated_at', weekAgo.toISOString())
      .limit(20),
    supabase
      .from('opportunities')
      .select('id, stage, value_estimate, lost_reason, updated_at, lead:leads(name)')
      .eq('stage', 'lost')
      .gte('updated_at', weekAgo.toISOString())
      .limit(20),
    supabase
      .from('opportunities')
      .select('id')
      .eq('stage', 'complete')
      .gte('updated_at', twoWeeksAgo.toISOString())
      .lt('updated_at', weekAgo.toISOString()),
    supabase
      .from('opportunities')
      .select('id')
      .eq('stage', 'lost')
      .gte('updated_at', twoWeeksAgo.toISOString())
      .lt('updated_at', weekAgo.toISOString()),
    supabase
      .from('stage_log')
      .select('from_stage, to_stage, changed_at, opportunity:opportunities(lead:leads(name))')
      .gte('changed_at', weekAgo.toISOString())
      .order('changed_at', { ascending: false })
      .limit(50),
    supabase
      .from('tasks')
      .select('type, status, due_at')
      .neq('status', 'done')
      .limit(30),
    supabase
      .from('bookings')
      .select('type, outcome, scheduled_at')
      .gte('scheduled_at', weekAgo.toISOString())
      .limit(20),
    supabase
      .from('leads')
      .select('id')
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('leads')
      .select('id')
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', weekAgo.toISOString()),
  ])

  const active = activeOpps.data ?? []
  const won = wonOpps.data ?? []
  const lost = lostOpps.data ?? []
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

  const openai = getOpenAI()

  const systemPrompt = `You are a pipeline analyst for PaxBespoke, a premium bespoke IKEA Pax wardrobe company in the UK. Produce a weekly pipeline health report.

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
PRIOR WEEK: ${priorWon.data?.length ?? 0} won, ${priorLost.data?.length ?? 0} lost

STAGE TRANSITIONS (7d): ${transitions.length} moves${transitions.length > 0 ? ': ' + transitions.slice(0, 10).map((t: any) => `${(t.opportunity as any)?.lead?.name ?? '?'}: ${t.from_stage ?? 'new'} → ${t.to_stage}`).join(', ') : ''}

NEW LEADS: ${newLeads.data?.length ?? 0} this week vs ${priorLeads.data?.length ?? 0} prior week

TASKS: ${openTasks.length} open, ${overdueTasks.length} overdue
BOOKINGS: ${recentBookings.length} this week, ${noShows.length} no-shows

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
      temperature: 0.4,
      max_tokens: 800,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw)
    result.period_start = weekAgo.toISOString()
    result.period_end = now.toISOString()
    result.generated_at = now.toISOString()

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pipeline health check failed'
    console.error('Pipeline health error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
