import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'
import { BUSINESS_CONTEXT, safeParseAIJson } from '@/lib/crm/ai-context'

export const maxDuration = 45

export interface EveningDigest {
  headline: string
  today_summary: string
  tomorrow_prep: {
    lead_name: string
    lead_id: string
    action: string
    context: string
  }[]
  wins_today: string[]
  watch_list: {
    lead_name: string
    lead_id: string
    concern: string
  }[]
  close_of_day_tip: string
  generated_at: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userName } = await request.json().catch(() => ({ userName: undefined }))

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const [oppsRes, tasksRes, bookingsRes, stageLogRes, leadsRes] = await Promise.all([
    // Active pipeline
    supabase
      .from('opportunities')
      .select('id, stage, stage_entered_at, value_estimate, lead:leads(id, name, project_type)')
      .eq('owner_user_id', user.id)
      .not('stage', 'in', '(won,lost)')
      .order('updated_at', { ascending: false })
      .limit(25),

    // Open tasks due today or tomorrow
    supabase
      .from('tasks')
      .select('id, description, type, due_at, status, opportunity_id')
      .eq('owner_user_id', user.id)
      .eq('status', 'open')
      .lte('due_at', tomorrowEnd.toISOString())
      .order('due_at', { ascending: true })
      .limit(15),

    // Bookings tomorrow
    supabase
      .from('bookings')
      .select('id, type, scheduled_at, opportunity:opportunities(lead:leads(id, name))')
      .gte('scheduled_at', tomorrow.toISOString())
      .lte('scheduled_at', tomorrowEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10),

    // Stage changes today
    supabase
      .from('stage_log')
      .select('id, from_stage, to_stage, changed_at, opportunity:opportunities(lead:leads(id, name))')
      .gte('changed_at', todayStart.toISOString())
      .order('changed_at', { ascending: false })
      .limit(10),

    // New leads today
    supabase
      .from('leads')
      .select('id, name, project_type, created_at')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const opps = oppsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const bookings = bookingsRes.data ?? []
  const stageLogs = stageLogRes.data ?? []
  const newLeads = leadsRes.data ?? []

  const overdueTasks = tasks.filter((t) => t.due_at && new Date(t.due_at) < now)
  const dueTomorrow = tasks.filter((t) => {
    if (!t.due_at) return false
    const d = new Date(t.due_at)
    return d >= tomorrow && d <= tomorrowEnd
  })

  const contextBlock = `
TODAY: ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
USER: ${userName ?? 'Sales rep'}

PIPELINE (${opps.length} active deals):
${opps.map((o) => {
  const lead = Array.isArray(o.lead) ? o.lead[0] : o.lead as { id: string; name: string; project_type?: string } | null
  return `- ${lead?.name ?? 'Unknown'} | ${o.stage} | ${o.value_estimate ? `£${Number(o.value_estimate).toLocaleString('en-GB')}` : 'no value'}`
}).join('\n')}

STAGE CHANGES TODAY (${stageLogs.length}):
${stageLogs.map((s) => {
  const opp = Array.isArray(s.opportunity) ? s.opportunity[0] : s.opportunity as { lead?: { name?: string } } | null
  const lead = Array.isArray(opp?.lead) ? opp?.lead[0] : opp?.lead as { name?: string } | null
  return `- ${lead?.name ?? 'Unknown'}: ${s.from_stage} → ${s.to_stage}`
}).join('\n') || 'None'}

NEW LEADS TODAY (${newLeads.length}):
${newLeads.map((l) => `- ${l.name} (${l.project_type ?? 'unknown'})`).join('\n') || 'None'}

OVERDUE TASKS (${overdueTasks.length}):
${overdueTasks.map((t) => `- ${t.description}`).join('\n') || 'None'}

TASKS DUE TOMORROW (${dueTomorrow.length}):
${dueTomorrow.map((t) => `- ${t.description}`).join('\n') || 'None'}

BOOKINGS TOMORROW (${bookings.length}):
${bookings.map((b) => {
  const opp = Array.isArray(b.opportunity) ? b.opportunity[0] : b.opportunity as { lead?: { id?: string; name?: string } } | null
  const lead = Array.isArray(opp?.lead) ? opp?.lead[0] : opp?.lead as { id?: string; name?: string } | null
  return `- ${b.type} with ${lead?.name ?? 'Unknown'} at ${new Date(b.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}).join('\n') || 'None'}
`.trim()

  const systemPrompt = `You are an AI sales coach for PaxBespoke. Generate a concise end-of-day digest to help the sales rep wrap up today and prepare for tomorrow.

${BUSINESS_CONTEXT}

RULES:
- Be specific: use lead names, stages, amounts
- tomorrow_prep should list the 2-3 most important actions for tomorrow, with context for each
- wins_today should celebrate genuine progress (stage advances, new leads, payments)
- watch_list should flag leads that need attention but aren't yet overdue
- close_of_day_tip should be a single actionable insight based on today's data
- lead_id fields must be actual UUIDs from the data — use the opportunity's lead id

Respond with ONLY valid JSON:
{
  "headline": "<one-line summary of the day>",
  "today_summary": "<2-3 sentences on what happened today>",
  "tomorrow_prep": [
    { "lead_name": "", "lead_id": "", "action": "", "context": "" }
  ],
  "wins_today": ["<win 1>", "<win 2>"],
  "watch_list": [
    { "lead_name": "", "lead_id": "", "concern": "" }
  ],
  "close_of_day_tip": "<specific tip>",
  "generated_at": "${now.toISOString()}"
}`

  try {
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate my evening digest:\n\n${contextBlock}` },
      ],
      temperature: 0.4,
      max_tokens: 800,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = safeParseAIJson(raw) as EveningDigest | null
    if (!result) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 })

    // Resolve lead names → IDs from the pipeline data for tomorrow_prep and watch_list
    const leadMap = new Map<string, string>()
    opps.forEach((o) => {
      const lead = Array.isArray(o.lead) ? o.lead[0] : o.lead as { id: string; name: string } | null
      if (lead?.name && lead?.id) leadMap.set(lead.name.toLowerCase(), lead.id)
    })
    newLeads.forEach((l) => { if (l.name) leadMap.set(l.name.toLowerCase(), l.id) })

    function resolveId(name: string, existingId: string): string {
      if (existingId && /^[0-9a-f-]{36}$/i.test(existingId)) return existingId
      return leadMap.get(name.toLowerCase()) ?? existingId
    }

    if (Array.isArray(result.tomorrow_prep)) {
      result.tomorrow_prep = result.tomorrow_prep.map((item) => ({
        ...item,
        lead_id: resolveId(item.lead_name, item.lead_id),
      }))
    }
    if (Array.isArray(result.watch_list)) {
      result.watch_list = result.watch_list.map((item) => ({
        ...item,
        lead_id: resolveId(item.lead_name, item.lead_id),
      }))
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Evening digest failed'
    console.error('AI evening-digest error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
