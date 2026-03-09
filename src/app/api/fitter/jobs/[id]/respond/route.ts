'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Fitter responds to a job offer: accept or decline.
 * Declined jobs auto-route to the open board for other fitters.
 */
export async function POST(
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
      .select('id, name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    // Fetch job — must belong to this fitter and be in 'offered' status
    const { data: job } = await admin
      .from('fitting_jobs')
      .select('id, job_code, status, subcontractor_id, offer_expires_at, customer_name, scheduled_date')
      .eq('id', id)
      .eq('subcontractor_id', sub.id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'offered') {
      return NextResponse.json(
        { error: `Job is not in offered status (current: ${job.status})` },
        { status: 400 }
      )
    }

    // Check if offer has expired
    if (job.offer_expires_at && new Date(job.offer_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This offer has expired' }, { status: 410 })
    }

    const body = await req.json()
    const { response, decline_reason } = body

    if (response !== 'accepted' && response !== 'declined') {
      return NextResponse.json({ error: 'response must be "accepted" or "declined"' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (response === 'accepted') {
      // Accept: transition to assigned
      await admin
        .from('fitting_jobs')
        .update({
          status: 'assigned',
          offer_response: 'accepted',
          updated_at: now,
        })
        .eq('id', id)

      // Update offer record
      await admin
        .from('fitting_job_offers')
        .update({ response: 'accepted', responded_at: now })
        .eq('fitting_job_id', id)
        .eq('subcontractor_id', sub.id)
        .is('response', null)

      // Create calendar event
      if (job.scheduled_date) {
        try {
          const { createFittingEvent } = await import('@/lib/fitter/google-calendar')
          await createFittingEvent(sub.id, {
            id: job.id,
            job_code: job.job_code,
            customer_name: job.customer_name || 'Customer',
            customer_address: null,
            scheduled_date: job.scheduled_date,
            estimated_duration_hours: 8,
          })
        } catch (e) {
          console.error('Calendar event error:', e)
        }
      }

      // Notify office
      try {
        const { notifyOfficeOfferResponse } = await import('@/lib/fitter/notifications')
        await notifyOfficeOfferResponse(job.job_code, sub.name, 'accepted')
      } catch (e) {
        console.error('Notification error:', e)
      }

      // Sync pipeline stage
      try {
        const { syncOpportunityStage } = await import('@/lib/fitter/sync-stage')
        await syncOpportunityStage(id, 'assigned')
      } catch (e) {
        console.error('Stage sync error:', e)
      }

      return NextResponse.json({ status: 'assigned', message: 'Job accepted' })
    }

    // Decline: move to open board
    await admin
      .from('fitting_jobs')
      .update({
        status: 'open_board',
        offer_response: 'declined',
        decline_reason: decline_reason || null,
        subcontractor_id: null,
        open_board_at: now,
        updated_at: now,
      })
      .eq('id', id)

    // Update offer record
    await admin
      .from('fitting_job_offers')
      .update({
        response: 'declined',
        decline_reason: decline_reason || null,
        responded_at: now,
      })
      .eq('fitting_job_id', id)
      .eq('subcontractor_id', sub.id)
      .is('response', null)

    // Update fitter's decline rate
    const { count: totalOffers } = await admin
      .from('fitting_job_offers')
      .select('*', { count: 'exact', head: true })
      .eq('subcontractor_id', sub.id)
      .not('response', 'is', null)

    const { count: declinedOffers } = await admin
      .from('fitting_job_offers')
      .select('*', { count: 'exact', head: true })
      .eq('subcontractor_id', sub.id)
      .eq('response', 'declined')

    if (totalOffers && totalOffers > 0) {
      const declineRate = Math.round(((declinedOffers || 0) / totalOffers) * 100)
      await admin
        .from('subcontractors')
        .update({ decline_rate: declineRate })
        .eq('id', sub.id)
    }

    // Notify office
    try {
      const { notifyOfficeOfferResponse } = await import('@/lib/fitter/notifications')
      await notifyOfficeOfferResponse(job.job_code, sub.name, 'declined', decline_reason)
    } catch (e) {
      console.error('Notification error:', e)
    }

    // Sync pipeline stage (revert to fitting_confirmed)
    try {
      const { syncOpportunityStage } = await import('@/lib/fitter/sync-stage')
      await syncOpportunityStage(id, 'open_board')
    } catch (e) {
      console.error('Stage sync error:', e)
    }

    // Create urgent task for reassignment
    try {
      const { data: fullJob } = await admin
        .from('fitting_jobs')
        .select('opportunity_id')
        .eq('id', id)
        .single()

      if (fullJob?.opportunity_id) {
        await admin.from('tasks').insert({
          opportunity_id: fullJob.opportunity_id,
          type: 'assign_fitter',
          description: `URGENT: Reassign fitter for ${job.customer_name || 'Customer'} (${job.job_code}) — ${sub.name} declined${decline_reason ? `: ${decline_reason}` : ''}`,
          priority: 'high',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    } catch (e) {
      console.error('Task creation error:', e)
    }

    return NextResponse.json({
      status: 'open_board',
      message: 'Job declined and moved to open board',
    })
  } catch (err: unknown) {
    console.error('Offer respond error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to respond to offer' },
      { status: 500 }
    )
  }
}
