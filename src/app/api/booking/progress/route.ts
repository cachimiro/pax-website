import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const progressSchema = z.object({
  visitor_id: z.string().min(1),
  step: z.number().int().min(0).max(9),
  step_label: z.string().optional(),
  // Contact info (captured at step 1)
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp_opt_in: z.boolean().optional(),
  // Form fields (progressively captured)
  postcode: z.string().optional(),
  postcode_location: z.string().optional(),
  room: z.string().optional(),
  style: z.string().optional(),
  package_choice: z.string().optional(),
  budget_range: z.string().optional(),
  timeline: z.string().optional(),
  // Attribution
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  landing_page: z.string().optional(),
  referrer: z.string().optional(),
  device_type: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Rate limit: 30 progress saves per IP per minute
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`progress:${ip}`, { limit: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    let body: Record<string, unknown>
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      const text = await request.text()
      body = JSON.parse(text)
    }

    const parsed = progressSchema.safeParse(body)
    if (!parsed.success) {
      return new NextResponse(null, { status: 204 })
    }

    const data = parsed.data
    const supabase = createAdminClient()

    // Filter empty strings to null for cleaner DB storage
    const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined)
    const cleanEmail = clean(data.email)

    // Build the upsert payload — only include non-empty fields
    const upsertData: Record<string, unknown> = {
      visitor_id: data.visitor_id,
      last_step: data.step,
      last_step_label: data.step_label || null,
      last_activity_at: new Date().toISOString(),
    }

    // Contact info
    if (clean(data.name)) upsertData.name = clean(data.name)
    if (cleanEmail) upsertData.email = cleanEmail
    if (clean(data.phone)) upsertData.phone = clean(data.phone)
    if (data.whatsapp_opt_in !== undefined) upsertData.whatsapp_opt_in = data.whatsapp_opt_in

    // Form fields
    if (clean(data.postcode)) upsertData.postcode = clean(data.postcode)
    if (clean(data.postcode_location)) upsertData.postcode_location = clean(data.postcode_location)
    if (clean(data.room)) upsertData.room = clean(data.room)
    if (clean(data.style)) upsertData.style = clean(data.style)
    if (clean(data.package_choice)) upsertData.package_choice = clean(data.package_choice)
    if (clean(data.budget_range)) upsertData.budget_range = clean(data.budget_range)
    if (clean(data.timeline)) upsertData.timeline = clean(data.timeline)

    // Attribution (only set on first save)
    if (clean(data.utm_source)) upsertData.utm_source = clean(data.utm_source)
    if (clean(data.utm_medium)) upsertData.utm_medium = clean(data.utm_medium)
    if (clean(data.utm_campaign)) upsertData.utm_campaign = clean(data.utm_campaign)
    if (clean(data.utm_content)) upsertData.utm_content = clean(data.utm_content)
    if (clean(data.utm_term)) upsertData.utm_term = clean(data.utm_term)
    if (clean(data.landing_page)) upsertData.landing_page = clean(data.landing_page)
    if (clean(data.referrer)) upsertData.referrer = clean(data.referrer)
    if (clean(data.device_type)) upsertData.device_type = clean(data.device_type)

    // Try to find existing active abandonment for this visitor
    const { data: existing } = await supabase
      .from('form_abandonments')
      .select('id, last_step')
      .eq('visitor_id', data.visitor_id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (existing) {
      // Update existing — only advance step forward, never backward
      const updatePayload = { ...upsertData }
      delete updatePayload.visitor_id
      if (data.step < existing.last_step) {
        delete updatePayload.last_step
        delete updatePayload.last_step_label
      }

      await supabase
        .from('form_abandonments')
        .update(updatePayload)
        .eq('id', existing.id)
    } else {
      // Also check if there's an active abandonment with the same email
      // (visitor_id may have changed across sessions)
      if (cleanEmail) {
        const { data: emailMatch } = await supabase
          .from('form_abandonments')
          .select('id, last_step')
          .eq('email', cleanEmail)
          .eq('status', 'active')
          .limit(1)
          .single()

        if (emailMatch) {
          const updatePayload = { ...upsertData }
          delete updatePayload.visitor_id
          // Update visitor_id to the new one
          updatePayload.visitor_id = data.visitor_id
          if (data.step < emailMatch.last_step) {
            delete updatePayload.last_step
            delete updatePayload.last_step_label
          }

          await supabase
            .from('form_abandonments')
            .update(updatePayload)
            .eq('id', emailMatch.id)

          return new NextResponse(null, { status: 204 })
        }
      }

      // Create new abandonment record
      upsertData.status = 'active'
      await supabase.from('form_abandonments').insert(upsertData)
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    // Never fail — progress tracking should not break the user experience
    return new NextResponse(null, { status: 204 })
  }
}
