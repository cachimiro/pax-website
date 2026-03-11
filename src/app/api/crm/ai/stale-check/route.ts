import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

interface StaleOpportunity {
  lead_id: string
  lead_name: string
  opportunity_id: string
  stage: string
  days_in_stage: number
  last_activity: string | null
  owner_user_id: string | null
}

/**
 * Returns opportunities that have been in their current stage longer than
 * the stage's expected duration, with no recent activity.
 *
 * Thresholds (days) before a lead is considered stale per stage:
 */
const STALE_THRESHOLDS: Record<string, number> = {
  new_enquiry:       2,
  call1_scheduled:   3,
  qualified:         5,
  meet1_completed:   5,
  design_created:    7,
  quote_sent:        7,
  visit_required:    7,
  visit_scheduled:   3,
  visit_completed:   5,
  meet2_completed:   5,
  deposit_pending:   7,
  deposit_paid:      5,
  fitting_confirmed: 14,
  fitting_complete:  7,
  on_hold:           30,
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Optional: filter to current user's leads only
  const { searchParams } = new URL(request.url)
  const ownerOnly = searchParams.get('owner_only') !== 'false'

  try {
    let query = supabase
      .from('opportunities')
      .select(`
        id,
        stage,
        updated_at,
        owner_user_id,
        leads!inner(id, name)
      `)
      .not('stage', 'in', '(won,lost)')
      .not('stage', 'is', null)

    if (ownerOnly) {
      query = query.eq('owner_user_id', user.id)
    }

    const { data: opps, error } = await query

    if (error) {
      console.error('stale-check query error:', error.message)
      return NextResponse.json({ stale: [] })
    }

    const now = Date.now()
    const stale: StaleOpportunity[] = []

    for (const opp of opps ?? []) {
      const threshold = STALE_THRESHOLDS[opp.stage] ?? 14
      const enteredAt = opp.updated_at ? new Date(opp.updated_at).getTime() : null
      if (!enteredAt) continue

      const daysInStage = Math.floor((now - enteredAt) / (1000 * 60 * 60 * 24))
      if (daysInStage < threshold) continue

      // Check for recent activity (message or task in last 48h)
      const cutoff = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
      const lead = Array.isArray(opp.leads) ? opp.leads[0] : opp.leads as { id: string; name: string }

      const [{ count: recentMessages }, { count: recentTasks }] = await Promise.all([
        supabase
          .from('message_logs')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .gte('sent_at', cutoff),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('opportunity_id', opp.id)
          .gte('created_at', cutoff),
      ])

      if ((recentMessages ?? 0) > 0 || (recentTasks ?? 0) > 0) continue

      // Get last activity timestamp
      const { data: lastMsg } = await supabase
        .from('message_logs')
        .select('sent_at')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      stale.push({
        lead_id: lead.id,
        lead_name: lead.name,
        opportunity_id: opp.id,
        stage: opp.stage,
        days_in_stage: daysInStage,
        last_activity: lastMsg?.sent_at ?? null,
        owner_user_id: opp.owner_user_id,
      })
    }

    // Sort by most stale first
    stale.sort((a, b) => b.days_in_stage - a.days_in_stage)

    return NextResponse.json({ stale: stale.slice(0, 10) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stale check failed'
    console.error('stale-check error:', message)
    return NextResponse.json({ stale: [] })
  }
}
