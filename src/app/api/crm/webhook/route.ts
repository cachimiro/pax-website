import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignOwner } from '@/lib/crm/routing'
import { z } from 'zod'

const webhookSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  postcode: z.string().optional(),
  project_type: z.string().optional(),
  budget_band: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.CRM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = webhookSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createAdminClient()

    // Assign owner based on postcode routing
    let ownerId: string | null = null
    if (data.postcode) {
      try {
        ownerId = await assignOwner(supabase, data.postcode)
      } catch {
        // No available user for this region — leave unassigned
      }
    }

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        postcode: data.postcode ?? null,
        project_type: data.project_type ?? null,
        budget_band: data.budget_band ?? null,
        notes: data.notes ?? null,
        source: data.source ?? 'webhook',
        owner_user_id: ownerId,
        status: 'new',
      })
      .select()
      .single()

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 })
    }

    // Create opportunity at new_enquiry stage
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .insert({
        lead_id: lead.id,
        stage: 'new_enquiry',
        owner_user_id: ownerId,
      })
      .select()
      .single()

    if (oppError) {
      return NextResponse.json({ error: oppError.message }, { status: 500 })
    }

    // Create initial task: call1_attempt
    await supabase.from('tasks').insert({
      opportunity_id: opportunity.id,
      type: 'call1_attempt',
      due_at: new Date().toISOString(),
      owner_user_id: ownerId,
      status: 'open',
      description: `First call attempt for ${data.name}`,
    })

    // Log stage
    await supabase.from('stage_log').insert({
      opportunity_id: opportunity.id,
      to_stage: 'new_enquiry',
      notes: 'Auto-created via webhook',
    })

    // Update owner's active_opportunities count
    if (ownerId) {
      await supabase
        .from('profiles')
        .update({ active_opportunities: (await supabase.from('profiles').select('active_opportunities').eq('id', ownerId).single()).data?.active_opportunities + 1 || 1 })
        .eq('id', ownerId)
    }

    return NextResponse.json(
      { lead_id: lead.id, opportunity_id: opportunity.id },
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
