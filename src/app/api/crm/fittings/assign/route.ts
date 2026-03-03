import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // Verify CRM user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      opportunity_id,
      subcontractor_id,
      scheduled_date,
      customer_name,
      customer_address,
      customer_phone,
      notes,
    } = body

    if (!opportunity_id || !subcontractor_id) {
      return NextResponse.json({ error: 'opportunity_id and subcontractor_id required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify subcontractor is active
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id, name, status')
      .eq('id', subcontractor_id)
      .single()

    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'Subcontractor not found or inactive' }, { status: 400 })
    }

    // Check no existing job for this opportunity
    const { data: existing } = await admin
      .from('fitting_jobs')
      .select('id')
      .eq('opportunity_id', opportunity_id)
      .not('status', 'eq', 'cancelled')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'A fitting job already exists for this opportunity' }, { status: 409 })
    }

    // Create fitting job
    const { data: job, error: insertErr } = await admin
      .from('fitting_jobs')
      .insert({
        opportunity_id,
        subcontractor_id,
        status: 'assigned',
        scheduled_date: scheduled_date || null,
        customer_name: customer_name || null,
        customer_address: customer_address || null,
        customer_phone: customer_phone || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    console.log(`Fitting job ${job.job_code} created for opportunity ${opportunity_id}, assigned to ${sub.name}`)

    // Notify fitter
    try {
      const { data: subFull } = await admin.from('subcontractors').select('email').eq('id', subcontractor_id).single()
      if (subFull?.email) {
        const { notifyFitterJobAssigned } = await import('@/lib/fitter/notifications')
        await notifyFitterJobAssigned(subFull.email, job.job_code, customer_name || 'Customer', scheduled_date)
      }
    } catch (notifErr) {
      console.error('Failed to send assignment notification:', notifErr)
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
