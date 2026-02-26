import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead, opportunity } = await request.json()
  if (!lead) return NextResponse.json({ error: 'lead is required' }, { status: 400 })

  const openai = getOpenAI()

  const systemPrompt = `You are an AI sales analyst for PaxBespoke, a premium bespoke IKEA Pax wardrobe company in North West England. You score leads 0-100 and provide reasoning.

Context about PaxBespoke:
- Service area: NW England (Warrington, Chester, Manchester, Liverpool, Cheshire)
- Average project value: £2,000-£6,000
- Premium service: design consultations, custom fitting, professional installation
- Target customer: homeowners wanting fitted wardrobes, walk-in closets, dressing rooms

Score the lead based on:
1. Budget fit (0-30): Higher budgets = higher score. £5000+ is ideal.
2. Location match (0-20): NW England postcodes (WA, CW, CH, M, L, SK, WN, BL, OL, PR) score highest.
3. Engagement signals (0-20): Has phone + email + postcode + project details = high engagement.
4. Project type (0-15): Walk-in wardrobes and dressing rooms are highest value.
5. Timing & urgency (0-15): Recent enquiries with quick response times score higher.

Respond with ONLY valid JSON, no markdown:
{
  "score": <number 0-100>,
  "tier": "hot" | "warm" | "cold",
  "summary": "<one sentence explaining the score>",
  "factors": [
    { "label": "<factor name>", "score": <number>, "max": <max points>, "insight": "<brief insight>" }
  ],
  "closing_tip": "<one actionable tip for closing this lead>"
}`

  const userPrompt = `Score this lead:

Name: ${lead.name}
Email: ${lead.email ?? 'Not provided'}
Phone: ${lead.phone ?? 'Not provided'}
Postcode: ${lead.postcode ?? 'Not provided'}
Project type: ${lead.project_type ?? 'Not specified'}
Budget band: ${lead.budget_band ?? 'Not specified'}
Source: ${lead.source ?? 'Unknown'}
Notes: ${lead.notes ?? 'None'}
Created: ${lead.created_at}
Status: ${lead.status}
${opportunity ? `
Opportunity stage: ${opportunity.stage}
Estimated value: ${opportunity.value_estimate ? '£' + opportunity.value_estimate : 'Not set'}
Days in pipeline: ${Math.round((Date.now() - new Date(opportunity.created_at).getTime()) / 86400000)}
` : 'No opportunity linked yet.'}`

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI scoring failed'
    console.error('AI score error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
