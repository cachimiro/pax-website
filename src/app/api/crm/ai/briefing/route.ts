import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, PIPELINE_STAGES, safeParseAIJson } from '@/lib/crm/ai-context'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userName } = await request.json()

  // Gather pipeline data for this user
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysOut = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const [oppsRes, tasksRes, bookingsRes, stageLogRes, leadsRes, designsRes, quotesRes, visitsRes, fittingsRes] = await Promise.all([
    supabase
      .from('opportunities')
      .select('*, lead:leads(id, name, project_type, budget_band, status)')
      .neq('stage', 'lost')
      .neq('stage', 'complete')
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('tasks')
      .select('*')
      .neq('status', 'done')
      .order('due_at', { ascending: true })
      .limit(20),
    supabase
      .from('bookings')
      .select('*, opportunity:opportunities(lead:leads(name))')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', twoDaysOut.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10),
    supabase
      .from('stage_log')
      .select('*, opportunity:opportunities(lead:leads(name))')
      .gte('changed_at', yesterday.toISOString())
      .order('changed_at', { ascending: false })
      .limit(15),
    supabase
      .from('leads')
      .select('id, name, status, created_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('designs')
      .select('id, opportunity_id, created_at')
      .gte('created_at', yesterday.toISOString()),
    supabase
      .from('quotes')
      .select('id, amount, status, created_at')
      .gte('created_at', yesterday.toISOString()),
    supabase
      .from('visits')
      .select('id, scheduled_at, status')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', twoDaysOut.toISOString()),
    supabase
      .from('fitting_slots')
      .select('id, confirmed_date, status')
      .gte('created_at', yesterday.toISOString()),
  ])

  const opportunities = oppsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const bookings = bookingsRes.data ?? []
  const stageLog = stageLogRes.data ?? []
  const newLeads = leadsRes.data ?? []

  const overdueTasks = tasks.filter(
    (t: any) => t.due_at && new Date(t.due_at) < now
  )
  const upcomingBookings = bookings.filter(
    (b: any) => b.outcome === 'pending'
  )

  // Build a name → lead_id lookup from the opportunities we already fetched
  // so we can resolve AI-returned lead names to real UUIDs after generation
  const leadNameToId: Record<string, string> = {}
  for (const o of opportunities) {
    const lead = (o as any).lead
    if (lead?.name && lead?.id) {
      leadNameToId[lead.name.toLowerCase()] = lead.id
    }
  }
  for (const l of newLeads) {
    if (l.name && l.id) leadNameToId[l.name.toLowerCase()] = l.id
  }

  const totalValue = opportunities.reduce(
    (sum: number, o: any) => sum + (o.value_estimate ?? 0), 0
  )

  const openai = getOpenAI()

  const recentDesigns = designsRes.data ?? []
  const recentQuotes = quotesRes.data ?? []
  const upcomingVisits = visitsRes.data ?? []
  const recentFittings = fittingsRes.data ?? []

  const systemPrompt = `You are a sales assistant for PaxBespoke. Generate a concise daily briefing.

${BUSINESS_CONTEXT}

${PIPELINE_STAGES}

Respond with ONLY valid JSON:
{
  "greeting": "<time-appropriate greeting>",
  "summary": "<1-2 sentence overview of today's pipeline state>",
  "highlights": [
    { "label": "<metric name>", "value": "<value>", "trend": "up|down|flat" }
  ],
  "urgent_items": [
    { "lead_name": "<name>", "lead_id": "<id>", "action": "<what to do>", "urgency": "high|medium" }
  ],
  "tip_of_the_day": "<one actionable sales tip relevant to their current pipeline>"
}

Rules:
- Greeting format: if a name is provided use "Good [morning/afternoon/evening], [Name]." — if no name, use "Good [morning/afternoon/evening]." Never use "Hello there", "Hey", or "Hi there".
- Highlights should be 2-4 key metrics
- Urgent items should be max 3, prioritised by impact
- The tip should be specific to their pipeline state, not generic
- Be concise — this is a quick morning scan, not a report`

  const hour = now.getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const userPrompt = `Time: ${timeOfDay}${userName ? `\nRep name: ${userName}` : ''}

Pipeline: ${opportunities.length} active opportunities, total value £${totalValue.toLocaleString('en-GB')}
Stages: ${summariseStages(opportunities)}

Overdue tasks: ${overdueTasks.length > 0
  ? overdueTasks.map((t: any) => {
      const opp = opportunities.find((o: any) => o.id === t.opportunity_id)
      const lead = (opp as any)?.lead
      return `${lead?.name ?? 'Unknown'} (lead_id:${lead?.id ?? 'unknown'}) — ${t.type}${t.description ? ': ' + t.description : ''}`
    }).join('; ')
  : 'None'}
Open tasks: ${tasks.length}

Upcoming bookings (next 48h): ${upcomingBookings.length > 0 ? upcomingBookings.map((b: any) => `${b.type} with ${(b.opportunity as any)?.lead?.name ?? 'Unknown'} at ${b.scheduled_at}`).join(', ') : 'None'}

Stage changes (last 24h): ${stageLog.length > 0 ? stageLog.map((s: any) => `${(s.opportunity as any)?.lead?.name ?? 'Unknown'}: ${s.from_stage ?? 'new'} → ${s.to_stage}`).join(', ') : 'None'}

New leads (last 24h): ${newLeads.length > 0 ? newLeads.map((l: any) => l.name).join(', ') : 'None'}

Designs created (24h): ${recentDesigns.length}
Quotes sent (24h): ${recentQuotes.length}${recentQuotes.length > 0 ? `, total £${recentQuotes.reduce((s: number, q: any) => s + (q.amount ?? 0), 0).toLocaleString('en-GB')}` : ''}
Upcoming visits (48h): ${upcomingVisits.length}
Fittings confirmed (24h): ${recentFittings.filter((f: any) => f.confirmed_date).length}

Generate the daily briefing.`

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 600,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw)
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })
    result.generated_at = now.toISOString()

    // Resolve lead_ids: the AI may hallucinate IDs — replace with real ones
    // by matching the lead_name it returned against our name→id lookup
    if (Array.isArray(result.urgent_items)) {
      result.urgent_items = result.urgent_items.map((item: any) => {
        const nameKey = (item.lead_name ?? '').toLowerCase()
        // Use real ID from lookup; fall back to what AI returned only if it looks like a UUID
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const resolvedId =
          leadNameToId[nameKey] ??
          (UUID_RE.test(item.lead_id ?? '') ? item.lead_id : null)
        return { ...item, lead_id: resolvedId }
      })
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI briefing failed'
    console.error('AI briefing error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function summariseStages(opportunities: any[]): string {
  const counts: Record<string, number> = {}
  for (const o of opportunities) {
    const stage = o.stage?.replace(/_/g, ' ') ?? 'unknown'
    counts[stage] = (counts[stage] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([stage, count]) => `${count} in ${stage}`)
    .join(', ') || 'Empty pipeline'
}
