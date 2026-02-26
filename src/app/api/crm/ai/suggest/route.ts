import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead, opportunity, tasks, bookings, messages } = await request.json()
  if (!lead) return NextResponse.json({ error: 'lead is required' }, { status: 400 })

  const openai = getOpenAI()

  const systemPrompt = `You are an AI sales coach for PaxBespoke, a premium bespoke IKEA Pax wardrobe company in NW England. Analyse the lead's current state and suggest the single best next action.

Pipeline stages in order:
new_enquiry → call1_scheduled → qualified → call2_scheduled → proposal_agreed → awaiting_deposit → deposit_paid → onboarding_scheduled → onboarding_complete → production → installation → completed

Target timelines per stage:
- new_enquiry: respond within 1 day
- call1_scheduled: complete within 3 days
- qualified: schedule call 2 within 5 days
- call2_scheduled: complete within 3 days
- proposal_agreed: send deposit request within 7 days
- awaiting_deposit: follow up within 5 days
- deposit_paid: schedule onboarding within 3 days

Respond with ONLY valid JSON, no markdown:
{
  "action": "<specific action to take, e.g. 'Call Sarah to confirm her Call 1 appointment for Thursday'>",
  "reason": "<why this is the priority right now>",
  "urgency": "high" | "medium" | "low",
  "script_hint": "<optional 1-2 sentence talking point or email opener>",
  "risk": "<what happens if this isn't done soon>"
}`

  const daysInStage = opportunity
    ? Math.round((Date.now() - new Date(opportunity.updated_at).getTime()) / 86400000)
    : 0

  const userPrompt = `Lead: ${lead.name}
Stage: ${opportunity?.stage ?? 'No opportunity'}
Days in current stage: ${daysInStage}
Value estimate: ${opportunity?.value_estimate ? '£' + opportunity.value_estimate : 'Not set'}
Budget band: ${lead.budget_band ?? 'Unknown'}
Postcode: ${lead.postcode ?? 'Unknown'}
Project type: ${lead.project_type ?? 'Unknown'}
Source: ${lead.source ?? 'Unknown'}
Notes: ${lead.notes ?? 'None'}

Recent tasks: ${tasks?.length ? tasks.map((t: { type: string; status: string }) => `${t.type} (${t.status})`).join(', ') : 'None'}
Bookings: ${bookings?.length ? bookings.map((b: { type: string; outcome: string }) => `${b.type} (${b.outcome})`).join(', ') : 'None'}
Messages sent: ${messages?.length ?? 0}

What should the sales rep do next?`

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
    const message = err instanceof Error ? err.message : 'AI suggestion failed'
    console.error('AI suggest error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
