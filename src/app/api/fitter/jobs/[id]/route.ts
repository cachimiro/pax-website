import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Valid status transitions for fitters
const VALID_TRANSITIONS: Record<string, string[]> = {
  assigned: ['accepted'],
  claimed: ['accepted'],
  accepted: ['in_progress'],
  in_progress: ['completed'],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get subcontractor
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    // Fetch job — must belong to this fitter
    const { data: job, error } = await admin
      .from('fitting_jobs')
      .select('*')
      .eq('id', id)
      .eq('subcontractor_id', sub.id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ job })
  } catch (err: unknown) {
    console.error('Fitter job GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch job' },
      { status: 500 }
    )
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

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get subcontractor
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    // Verify job belongs to this fitter
    const { data: existing } = await admin
      .from('fitting_jobs')
      .select('id, status')
      .eq('id', id)
      .eq('subcontractor_id', sub.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    // Checklist updates
    if (body.checklist_before) updates.checklist_before = body.checklist_before
    if (body.checklist_after) updates.checklist_after = body.checklist_after

    // Notes
    if (body.notes_before !== undefined) updates.notes_before = body.notes_before
    if (body.notes_after !== undefined) updates.notes_after = body.notes_after

    // Photos/videos
    if (body.photos_before) updates.photos_before = body.photos_before
    if (body.photos_after) updates.photos_after = body.photos_after
    if (body.videos) updates.videos = body.videos

    // Status transition
    if (body.status) {
      const allowed = VALID_TRANSITIONS[existing.status]
      if (!allowed || !allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${body.status}` },
          { status: 400 }
        )
      }
      updates.status = body.status
      if (body.status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data: job, error } = await admin
      .from('fitting_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Sync pipeline stage
    if (body.status) {
      try {
        const { syncOpportunityStage } = await import('@/lib/fitter/sync-stage')
        await syncOpportunityStage(id, body.status)
      } catch (e) {
        console.error('Stage sync error:', e)
      }
    }

    // Notify office when job is completed
    if (body.status === 'completed') {
      try {
        const { data: subRow } = await admin.from('subcontractors').select('name').eq('id', sub.id).single()
        const { notifyOfficeJobCompleted } = await import('@/lib/fitter/notifications')
        await notifyOfficeJobCompleted(job.job_code, subRow?.name || 'Fitter', job.customer_name || 'Customer')
      } catch (notifErr) {
        console.error('Failed to send completion notification:', notifErr)
      }
    }

    return NextResponse.json({ job })
  } catch (err: unknown) {
    console.error('Fitter job PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update job' },
      { status: 500 }
    )
  }
}
