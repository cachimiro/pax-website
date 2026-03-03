import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: job, error } = await admin
      .from('fitting_jobs')
      .select('*, subcontractors(name, email, phone)')
      .eq('id', id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ job })
  } catch (err: unknown) {
    console.error('CRM fitting GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()

    const { data: existing } = await admin
      .from('fitting_jobs')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.action === 'approve') {
      if (existing.status !== 'signed_off') {
        return NextResponse.json({ error: 'Can only approve signed-off jobs' }, { status: 400 })
      }
      updates.status = 'approved'
      updates.approved_at = new Date().toISOString()
      updates.approved_by = user.id
    } else if (body.action === 'reject') {
      if (!['completed', 'signed_off'].includes(existing.status)) {
        return NextResponse.json({ error: 'Can only reject completed/signed-off jobs' }, { status: 400 })
      }
      updates.status = 'rejected'
      updates.rejection_reason = body.reason || null
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: job, error } = await admin
      .from('fitting_jobs')
      .update(updates)
      .eq('id', id)
      .select('*, subcontractors(name, email, phone)')
      .single()

    if (error) throw error

    // Notify fitter on rejection
    if (body.action === 'reject' && job.subcontractors?.email) {
      try {
        const { notifyFitterJobRejected } = await import('@/lib/fitter/notifications')
        await notifyFitterJobRejected(job.subcontractors.email, job.job_code, body.reason || null)
      } catch (notifErr) {
        console.error('Failed to send rejection notification:', notifErr)
      }
    }

    return NextResponse.json({ job })
  } catch (err: unknown) {
    console.error('CRM fitting PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
