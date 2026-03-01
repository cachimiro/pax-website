import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userName } = await request.json()

  // Gather pipeline data for this user
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysOut = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const [oppsRes, tasksRes, bookingsRes, stageLogRes, leadsRes] = await Promise.all([
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

  const totalValue = opportunities.reduce(
    (sum: number, o: any) => sum + (o.value_estimate ?? 0), 0
  )

  const openai = getOpenAI()

  const systemPrompt = `You are a sales assistant for PaxBespoke, a premium bespoke IKEA Pax wardrobe company in the UK. Generate a concise daily briefing for a sales rep.

Respond with ONLY valid JSON, no markdown:
{
  "greeting": "<time-appropriate greeting using the rep's name>",
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
- Keep the greeting natural and time-appropriate (morning/afternoon/evening)
- Highlights should be 2-4 key metrics
- Urgent items should be max 3, prioritised by impact
- The tip should be specific to their pipeline state, not generic
- Be concise — this is a quick morning scan, not a report`

  const hour = now.getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const userPrompt = `Time: ${timeOfDay}
Rep name: ${userName ?? 'there'}

Pipeline: ${opportunities.length} active opportunities, total value £${totalValue.toLocaleString('en-GB')}
Stages: ${summariseStages(opportunities)}

Overdue tasks: ${overdueTasks.length > 0 ? overdueTasks.map((t: any) => `${t.type}${t.description ? ': ' + t.description : ''}`).join(', ') : 'None'}
Open tasks: ${tasks.length}

Upcoming bookings (next 48h): ${upcomingBookings.length > 0 ? upcomingBookings.map((b: any) => `${b.type} with ${(b.opportunity as any)?.lead?.name ?? 'Unknown'} at ${b.scheduled_at}`).join(', ') : 'None'}

Stage changes (last 24h): ${stageLog.length > 0 ? stageLog.map((s: any) => `${(s.opportunity as any)?.lead?.name ?? 'Unknown'}: ${s.from_stage ?? 'new'} → ${s.to_stage}`).join(', ') : 'None'}

New leads (last 24h): ${newLeads.length > 0 ? newLeads.map((l: any) => l.name).join(', ') : 'None'}

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
    const result = JSON.parse(raw)
    result.generated_at = now.toISOString()

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
