import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OFFER_EXPIRY_HOURS = 24

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { opportunity_id, subcontractor_id, mode } = body

    if (!opportunity_id || !subcontractor_id) {
      return NextResponse.json({ error: 'opportunity_id and subcontractor_id required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify subcontractor is active
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id, name, email, status')
      .eq('id', subcontractor_id)
      .single()

    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'Subcontractor not found or inactive' }, { status: 400 })
    }

    // Check no existing active job for this opportunity
    const { data: existing } = await admin
      .from('fitting_jobs')
      .select('id')
      .eq('opportunity_id', opportunity_id)
      .not('status', 'in', '("cancelled","declined")')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An active fitting job already exists for this opportunity' }, { status: 409 })
    }

    const isOffer = mode === 'offer'
    const now = new Date()
    const expiresAt = new Date(now.getTime() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000)

    // Create fitting job with full job pack
    const { data: job, error: insertErr } = await admin
      .from('fitting_jobs')
      .insert({
        opportunity_id,
        subcontractor_id,
        assigned_by: user.id,
        status: isOffer ? 'offered' : 'assigned',
        scheduled_date: body.scheduled_date || null,
        customer_name: body.customer_name || null,
        customer_address: body.customer_address || null,
        customer_phone: body.customer_phone || null,
        customer_email: body.customer_email || null,
        fitting_fee: body.fitting_fee || null,
        scope_of_work: body.scope_of_work || null,
        access_notes: body.access_notes || null,
        parking_info: body.parking_info || null,
        ikea_order_ref: body.ikea_order_ref || null,
        special_instructions: body.special_instructions || null,
        design_documents: body.design_documents || [],
        measurement_documents: body.measurement_documents || [],
        estimated_duration_hours: body.estimated_duration_hours || 8,
        notes: body.notes || null,
        offered_at: isOffer ? now.toISOString() : null,
        offer_expires_at: isOffer ? expiresAt.toISOString() : null,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Track offer history
    if (isOffer) {
      await admin.from('fitting_job_offers').insert({
        fitting_job_id: job.id,
        subcontractor_id,
        offered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
    }

    console.log(`Fitting job ${job.job_code} ${isOffer ? 'offered to' : 'assigned to'} ${sub.name}`)

    // Sync pipeline stage
    try {
      const { syncOpportunityStage } = await import('@/lib/fitter/sync-stage')
      await syncOpportunityStage(job.id, isOffer ? 'offered' : 'assigned')
    } catch (e) {
      console.error('Stage sync error:', e)
    }

    // Create Google Calendar event for direct assignments
    if (!isOffer && body.scheduled_date) {
      try {
        const { createFittingEvent } = await import('@/lib/fitter/google-calendar')
        await createFittingEvent(subcontractor_id, {
          id: job.id,
          job_code: job.job_code,
          customer_name: body.customer_name || 'Customer',
          customer_address: body.customer_address || null,
          scheduled_date: body.scheduled_date,
          estimated_duration_hours: body.estimated_duration_hours || 8,
          scope_of_work: body.scope_of_work || null,
        })
      } catch (calErr) {
        console.error('Calendar event creation failed:', calErr)
      }
    }

    // Notify fitter
    try {
      if (sub.email) {
        const { notifyFitterJobAssigned } = await import('@/lib/fitter/notifications')
        await notifyFitterJobAssigned(
          sub.email, job.job_code,
          body.customer_name || 'Customer',
          body.scheduled_date,
          isOffer ? OFFER_EXPIRY_HOURS : undefined
        )
      }
    } catch (notifErr) {
      console.error('Failed to send notification:', notifErr)
    }

    return NextResponse.json({ job })
  } catch (err: unknown) {
    console.error('Fitting assign error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to assign fitting' },
      { status: 500 }
    )
  }
}
