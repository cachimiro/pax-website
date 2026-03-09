import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/cron/offer-expiry
 * Expire job offers that have passed their deadline.
 * Expired offers move to open_board status.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  const webhookSecret = req.headers.get('x-webhook-secret')

  const isAuthorized =
    (cronSecret && cronSecret === process.env.CRON_SECRET) ||
    (webhookSecret && webhookSecret === process.env.CRM_WEBHOOK_SECRET)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    // Find expired offers
    const { data: expired, error } = await admin
      .from('fitting_jobs')
      .select('id, job_code, subcontractor_id, customer_name')
      .eq('status', 'offered')
      .lt('offer_expires_at', now)

    if (error) throw error
    if (!expired || expired.length === 0) {
      return NextResponse.json({ expired: 0 })
    }

    let processed = 0
    for (const job of expired) {
      // Move to open board
      await admin
        .from('fitting_jobs')
        .update({
          status: 'open_board',
          offer_response: 'expired',
          subcontractor_id: null,
          open_board_at: now,
          updated_at: now,
        })
        .eq('id', job.id)

      // Update offer record
      if (job.subcontractor_id) {
        await admin
          .from('fitting_job_offers')
          .update({ response: 'expired', responded_at: now })
          .eq('fitting_job_id', job.id)
          .eq('subcontractor_id', job.subcontractor_id)
          .is('response', null)
      }

      // Sync pipeline stage (revert to fitting_confirmed)
      try {
        const { syncOpportunityStage } = await import('@/lib/fitter/sync-stage')
        await syncOpportunityStage(job.id, 'open_board')
      } catch (e) {
        console.error('[OFFER-EXPIRY] Stage sync error:', e)
      }

      // Create urgent task
      try {
        await admin.from('tasks').insert({
          opportunity_id: (await admin.from('fitting_jobs').select('opportunity_id').eq('id', job.id).single()).data?.opportunity_id,
          type: 'assign_fitter',
          description: `URGENT: Offer expired for ${job.customer_name || 'Customer'} (${job.job_code}) — reassign fitter`,
          priority: 'high',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      } catch {
        // non-critical
      }

      console.log(`[OFFER-EXPIRY] ${job.job_code} expired, moved to open board`)
      processed++
    }

    // Notify office about expired offers
    if (processed > 0) {
      try {
        const officeEmail = process.env.OFFICE_NOTIFICATION_EMAIL
        if (officeEmail) {
          const { sendEmail } = await import('@/lib/crm/messaging/channels')
          const jobList = expired.map(j => `${j.job_code} (${j.customer_name || 'Unknown'})`).join(', ')
          await sendEmail(
            officeEmail,
            `${processed} Job Offer(s) Expired`,
            `<p>${processed} job offer(s) have expired and moved to the Open Jobs Board: ${jobList}</p>
             <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/crm/fittings">View in CRM</a></p>`
          )
        }
      } catch (e) {
        console.error('[OFFER-EXPIRY] Notification error:', e)
      }
    }

    return NextResponse.json({ expired: processed })
  } catch (err: unknown) {
    console.error('[OFFER-EXPIRY] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process expired offers' },
      { status: 500 }
    )
  }
}
