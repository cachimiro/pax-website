import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** GET /api/fitter/jobs/board — list open board jobs available to claim */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify fitter is active and available for jobs
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id, available_for_jobs')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    // Fetch open board jobs (no subcontractor assigned)
    const { data: jobs, error } = await admin
      .from('fitting_jobs')
      .select('id, job_code, status, scheduled_date, customer_name, customer_address, fitting_fee, estimated_duration_hours, scope_of_work, open_board_at, created_at')
      .eq('status', 'open_board')
      .order('open_board_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ jobs: jobs || [] })
  } catch (err: unknown) {
    console.error('Open board GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch board' },
      { status: 500 }
    )
  }
}

/** POST /api/fitter/jobs/board — claim a job from the open board */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: sub } = await admin
      .from('subcontractors')
      .select('id, name, email')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    const { job_id } = await req.json()
    if (!job_id) {
      return NextResponse.json({ error: 'job_id required' }, { status: 400 })
    }

    // Atomically claim the job (only if still on open board)
    const { data: job, error } = await admin
      .from('fitting_jobs')
      .update({
        subcontractor_id: sub.id,
        status: 'claimed',
        claimed_from_board: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job_id)
      .eq('status', 'open_board')
      .select('id, job_code, customer_name')
      .single()

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job is no longer available — it may have been claimed by another fitter' },
        { status: 409 }
      )
    }

    // Track in offer history
    await admin.from('fitting_job_offers').insert({
      fitting_job_id: job.id,
      subcontractor_id: sub.id,
      offered_at: new Date().toISOString(),
      response: 'accepted',
      responded_at: new Date().toISOString(),
    })

    // Notify office
    try {
      const officeEmail = process.env.OFFICE_NOTIFICATION_EMAIL
      if (officeEmail) {
        const { sendEmail } = await import('@/lib/crm/messaging/channels')
        await sendEmail(
          officeEmail,
          `Job Claimed: ${job.job_code} — ${sub.name}`,
          `<p>${sub.name} has claimed job ${job.job_code} (${job.customer_name || 'Customer'}) from the Open Jobs Board.</p>
           <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/crm/fittings">View in CRM</a></p>`
        )
      }
    } catch (e) {
      console.error('Claim notification error:', e)
    }

    // Sync pipeline stage
    try {
      const { syncOpportunityStage } = await import('@/lib/fitter/sync-stage')
      await syncOpportunityStage(job.id, 'claimed')
    } catch (e) {
      console.error('Stage sync error:', e)
    }

    return NextResponse.json({ job, message: 'Job claimed successfully' })
  } catch (err: unknown) {
    console.error('Board claim error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to claim job' },
      { status: 500 }
    )
  }
}
