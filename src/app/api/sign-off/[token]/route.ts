import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySignOffToken } from '@/lib/fitter/tokens'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const payload = verifySignOffToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired sign-off link' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: job } = await admin
      .from('fitting_jobs')
      .select('job_code, customer_name, customer_address, scheduled_date, photos_after, checklist_after, status, sign_off_token')
      .eq('id', payload.fitting_job_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.sign_off_token !== token) {
      return NextResponse.json({ error: 'Invalid sign-off link' }, { status: 400 })
    }

    if (job.status === 'signed_off' || job.status === 'approved') {
      return NextResponse.json({ error: 'This fitting has already been signed off' }, { status: 400 })
    }

    return NextResponse.json({
      job_code: job.job_code,
      customer_name: job.customer_name,
      customer_address: job.customer_address,
      scheduled_date: job.scheduled_date,
      photos_after: job.photos_after || [],
      checklist_after: job.checklist_after || { items: [] },
    })
  } catch (err: unknown) {
    console.error('Sign-off GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const payload = verifySignOffToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired sign-off link' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: job } = await admin
      .from('fitting_jobs')
      .select('id, status, sign_off_token, job_code, customer_name')
      .eq('id', payload.fitting_job_id)
      .single()

    if (!job || job.sign_off_token !== token) {
      return NextResponse.json({ error: 'Invalid sign-off link' }, { status: 400 })
    }

    if (job.status === 'signed_off' || job.status === 'approved') {
      return NextResponse.json({ error: 'Already signed off' }, { status: 400 })
    }

    const body = await req.json()
    const { customer_signature, customer_signer_name, customer_signer_relation } = body

    if (!customer_signature || !customer_signer_name) {
      return NextResponse.json({ error: 'Signature and name required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: updateErr } = await admin
      .from('fitting_jobs')
      .update({
        status: 'signed_off',
        customer_signature,
        customer_signed_at: now,
        customer_signer_name,
        customer_signer_relation: customer_signer_relation || 'owner',
        signed_off_at: now,
        updated_at: now,
      })
      .eq('id', job.id)

    if (updateErr) throw updateErr

    console.log(`Job ${job.job_code} remotely signed off by ${customer_signer_name}`)

    // Sync pipeline stage
    try {
      const { syncOpportunityStage } = await import('@/lib/fitter/sync-stage')
      await syncOpportunityStage(job.id, 'signed_off')
    } catch (e) {
      console.error('Stage sync error:', e)
    }

    // Notify office
    try {
      const { notifyOfficeJobSignedOff } = await import('@/lib/fitter/notifications')
      await notifyOfficeJobSignedOff(job.job_code, job.customer_name || 'Customer', customer_signer_name, 'remote_link')
    } catch (notifErr) {
      console.error('Failed to send sign-off notification:', notifErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Sign-off POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sign-off failed' },
      { status: 500 }
    )
  }
}
