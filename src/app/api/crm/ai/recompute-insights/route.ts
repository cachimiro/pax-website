import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

// Called nightly by Vercel cron (vercel.json) or manually from Settings.
// Pure SQL aggregation — no OpenAI cost.
// Upserts into ai_insights so every AI prompt can read live benchmarks.

export async function POST(request: NextRequest) {
  // Verify cron secret or admin session
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow admin users to trigger manually
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const insights: Array<{
    insight_type: string
    stage: string | null
    metric_key: string
    metric_value: unknown
    sample_size: number
  }> = []

  // ── 1. Stage conversion rates ─────────────────────────────────────────────
  const { data: stageLogs } = await supabase
    .from('stage_log')
    .select('from_stage, to_stage, opportunity_id')

  if (stageLogs?.length) {
    // Count transitions from each stage
    const fromCounts: Record<string, number> = {}
    const toLost: Record<string, number> = {}
    const toNext: Record<string, Record<string, number>> = {}

    for (const log of stageLogs) {
      const from = log.from_stage ?? 'new_enquiry'
      fromCounts[from] = (fromCounts[from] ?? 0) + 1
      if (log.to_stage === 'lost') {
        toLost[from] = (toLost[from] ?? 0) + 1
      }
      if (!toNext[from]) toNext[from] = {}
      toNext[from][log.to_stage] = (toNext[from][log.to_stage] ?? 0) + 1
    }

    for (const [stage, total] of Object.entries(fromCounts)) {
      const lostCount = toLost[stage] ?? 0
      const conversionRate = total > 0 ? Math.round(((total - lostCount) / total) * 100) : 0
      const topNextStage = Object.entries(toNext[stage] ?? {})
        .filter(([s]) => s !== 'lost')
        .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

      insights.push({
        insight_type: 'stage_conversion',
        stage,
        metric_key: `${stage}_conversion_rate`,
        metric_value: {
          conversion_rate_pct: conversionRate,
          total_transitions: total,
          lost_count: lostCount,
          top_next_stage: topNextStage,
        },
        sample_size: total,
      })
    }
  }

  // ── 2. Average time in each stage ─────────────────────────────────────────
  const { data: stageLogsWithTime } = await supabase
    .from('stage_log')
    .select('opportunity_id, to_stage, changed_at')
    .order('opportunity_id')
    .order('changed_at')

  if (stageLogsWithTime?.length) {
    // For each opportunity, compute time spent in each stage
    const stageDurations: Record<string, number[]> = {}

    // Group by opportunity
    const byOpp: Record<string, typeof stageLogsWithTime> = {}
    for (const log of stageLogsWithTime) {
      if (!byOpp[log.opportunity_id]) byOpp[log.opportunity_id] = []
      byOpp[log.opportunity_id].push(log)
    }

    for (const logs of Object.values(byOpp)) {
      for (let i = 0; i < logs.length - 1; i++) {
        const stage = logs[i].to_stage
        const enteredAt = new Date(logs[i].changed_at).getTime()
        const leftAt = new Date(logs[i + 1].changed_at).getTime()
        const days = (leftAt - enteredAt) / 86_400_000
        if (days >= 0 && days < 365) { // sanity check
          if (!stageDurations[stage]) stageDurations[stage] = []
          stageDurations[stage].push(days)
        }
      }
    }

    for (const [stage, durations] of Object.entries(stageDurations)) {
      if (durations.length === 0) continue
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const sorted = [...durations].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      const p90 = sorted[Math.floor(sorted.length * 0.9)]

      insights.push({
        insight_type: 'avg_time_in_stage',
        stage,
        metric_key: `${stage}_avg_days`,
        metric_value: {
          avg_days: Math.round(avg * 10) / 10,
          median_days: Math.round(median * 10) / 10,
          p90_days: Math.round(p90 * 10) / 10,
        },
        sample_size: durations.length,
      })
    }
  }

  // ── 3. Lost reason patterns ───────────────────────────────────────────────
  const { data: lostOpps } = await supabase
    .from('opportunities')
    .select('stage, lost_reason')
    .eq('stage', 'lost')
    .not('lost_reason', 'is', null)

  if (lostOpps?.length) {
    // Group by the stage they were lost from (use stage_log last entry before lost)
    const reasonCounts: Record<string, number> = {}
    for (const opp of lostOpps) {
      const reason = opp.lost_reason ?? 'unknown'
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1
    }
    const total = lostOpps.length
    const topReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count, pct: Math.round((count / total) * 100) }))

    insights.push({
      insight_type: 'lost_reason_pattern',
      stage: null,
      metric_key: 'top_lost_reasons',
      metric_value: { reasons: topReasons, total_lost: total },
      sample_size: total,
    })
  }

  // ── 4. AI suggestion acceptance rates ────────────────────────────────────
  const { data: suggestionLogs } = await supabase
    .from('ai_suggestion_log')
    .select('suggestion_type, outcome')
    .not('outcome', 'is', null)

  if (suggestionLogs?.length) {
    const byType: Record<string, { accepted: number; total: number }> = {}
    for (const log of suggestionLogs) {
      if (!byType[log.suggestion_type]) byType[log.suggestion_type] = { accepted: 0, total: 0 }
      byType[log.suggestion_type].total++
      if (log.outcome === 'accepted') byType[log.suggestion_type].accepted++
    }

    for (const [type, counts] of Object.entries(byType)) {
      const rate = Math.round((counts.accepted / counts.total) * 100)
      insights.push({
        insight_type: 'suggestion_accuracy',
        stage: null,
        metric_key: `${type}_acceptance_rate`,
        metric_value: {
          acceptance_rate_pct: rate,
          accepted: counts.accepted,
          total: counts.total,
        },
        sample_size: counts.total,
      })
    }
  }

  // ── 5. Overall pipeline health metrics ───────────────────────────────────
  const { data: activeOpps } = await supabase
    .from('opportunities')
    .select('stage, value_estimate')
    .not('stage', 'in', '(lost,complete)')

  if (activeOpps?.length) {
    const totalValue = activeOpps.reduce((s, o) => s + (o.value_estimate ?? 0), 0)
    const byStage: Record<string, number> = {}
    for (const o of activeOpps) {
      byStage[o.stage] = (byStage[o.stage] ?? 0) + 1
    }

    insights.push({
      insight_type: 'pipeline_snapshot',
      stage: null,
      metric_key: 'current_pipeline',
      metric_value: {
        total_active: activeOpps.length,
        total_value: totalValue,
        by_stage: byStage,
      },
      sample_size: activeOpps.length,
    })
  }

  // ── Upsert all insights ───────────────────────────────────────────────────
  if (insights.length > 0) {
    const { error } = await supabase
      .from('ai_insights')
      .upsert(
        insights.map((i) => ({ ...i, computed_at: new Date().toISOString() })),
        { onConflict: 'insight_type,metric_key' }
      )
    if (error) {
      console.error('[recompute-insights] upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    insights_computed: insights.length,
    computed_at: new Date().toISOString(),
  })
}
