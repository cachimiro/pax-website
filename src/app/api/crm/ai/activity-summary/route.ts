import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead, stageLog, messages, tasks, bookings } = await request.json()
  if (!lead) return NextResponse.json({ error: 'lead is required' }, { status: 400 })

  const openai = getOpenAI()
  const now = new Date()
  const daysInPipeline = Math.round(
    (now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  const systemPrompt = `You are a sales assistant for PaxBespoke, a premium bespoke IKEA Pax wardrobe company in the UK. Summarise a lead's activity history into a concise narrative.

Respond with ONLY valid JSON, no markdown:
{
  "narrative": "<2-4 sentence natural language summary of this lead's journey so far>",
  "key_milestones": ["<milestone 1>", "<milestone 2>", ...],
  "days_in_pipeline": ${daysInPipeline},
  "engagement_level": "high|medium|low",
  "next_milestone": "<what should happen next>",
  "risk_note": "<optional risk or concern, or null if healthy>"
}

Rules:
- The narrative should read like a brief to a colleague taking over the account
- Key milestones: max 4, most recent first
- Engagement level: high = regular contact, medium = some gaps, low = mostly silent
- Be factual — don't invent details not in the data
- If the lead is new with minimal activity, say so briefly`

  // Truncate data for token efficiency
  const recentStageLog = (stageLog ?? []).slice(0, 10)
  const recentMessages = (messages ?? []).slice(0, 8)
  const recentTasks = (tasks ?? []).slice(0, 8)
  const recentBookings = (bookings ?? []).slice(0, 5)

  const userPrompt = `Lead: ${lead.name}
Status: ${lead.status}
Created: ${new Date(lead.created_at).toLocaleDateString('en-GB')}
Days in pipeline: ${daysInPipeline}
Project type: ${lead.project_type ?? 'Unknown'}
Budget: ${lead.budget_band ?? 'Unknown'}
Source: ${lead.source ?? 'Unknown'}
${lead.snoozed_until ? `Snoozed until: ${new Date(lead.snoozed_until).toLocaleDateString('en-GB')}` : ''}
${lead.opted_out ? 'Note: Lead has opted out of communications' : ''}

Stage changes: ${recentStageLog.length > 0
    ? recentStageLog.map((s: any) =>
        `${s.from_stage ?? 'new'} → ${s.to_stage} (${new Date(s.changed_at).toLocaleDateString('en-GB')})`
      ).join(', ')
    : 'None'}

Messages sent: ${recentMessages.length > 0
    ? recentMessages.map((m: any) =>
        `${m.channel} ${m.template ?? 'custom'} — ${m.status} (${new Date(m.sent_at).toLocaleDateString('en-GB')})`
      ).join(', ')
    : 'None'}

Tasks: ${recentTasks.length > 0
    ? recentTasks.map((t: any) =>
        `${t.type} — ${t.status}${t.due_at ? ' due ' + new Date(t.due_at).toLocaleDateString('en-GB') : ''}`
      ).join(', ')
    : 'None'}

Bookings: ${recentBookings.length > 0
    ? recentBookings.map((b: any) =>
        `${b.type} — ${b.outcome} (${b.date})`
      ).join(', ')
    : 'None'}

Summarise this lead's activity.`

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 400,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI activity summary failed'
    console.error('AI activity-summary error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
