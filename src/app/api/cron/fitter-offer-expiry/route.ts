import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

/**
 * Cron: every 15 minutes.
 * Finds expired job offers and either routes to the next eligible fitter
 * or posts to the open board if no eligible fitter is available.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 1. Find all jobs with expired offers
  const { data: expiredJobs, error: expiredError } = await admin
    .from('fitting_jobs')
    .select('id, opportunity_id, scheduled_date, subcontractor_id')
    .eq('status', 'offered')
    .lt('offer_expires_at', now)

  if (expiredError) {
    console.error('fitter-offer-expiry: query error', expiredError.message)
    return NextResponse.json({ error: expiredError.message }, { status: 500 })
  }

  if (!expiredJobs?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let routed = 0
  let boardPosted = 0

  for (const job of expiredJobs) {
    try {
      // 2. Mark current offer as expired in fitting_job_offers
      await admin
        .from('fitting_job_offers')
        .update({ response: 'expired', responded_at: now })
        .eq('fitting_job_id', job.id)
        .is('response', null)

      // 3. Update decline_rate on the current subcontractor
      if (job.subcontractor_id) {
        const { data: sub } = await admin
          .from('subcontractors')
          .select('decline_rate, total_offers')
          .eq('id', job.subcontractor_id)
          .single()
        if (sub) {
          const totalOffers = (sub.total_offers ?? 0) + 1
          const declines = Math.round(((sub.decline_rate ?? 0) / 100) * (totalOffers - 1)) + 1
          await admin
            .from('subcontractors')
            .update({ decline_rate: Math.round((declines / totalOffers) * 100), total_offers: totalOffers })
            .eq('id', job.subcontractor_id)
        }
      }

      // 4. Find already-declined subcontractors for this job
      const { data: previousOffers } = await admin
        .from('fitting_job_offers')
        .select('subcontractor_id')
        .eq('fitting_job_id', job.id)

      const alreadyOffered = new Set((previousOffers ?? []).map(o => o.subcontractor_id))

      // 5. Find next eligible fitter
      const jobDate = job.scheduled_date
        ? new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        : null

      const { data: candidates } = await admin
        .from('subcontractors')
        .select('id, user_id, max_jobs_per_day')
        .eq('status', 'active')
        .eq('available_for_jobs', true)
        .order('decline_rate', { ascending: true }) // prefer fitters with lower decline rate

      let nextFitter: { id: string; user_id: string } | null = null

      for (const candidate of candidates ?? []) {
        if (alreadyOffered.has(candidate.id)) continue

        // Check availability for the job date
        if (jobDate) {
          const { data: avail } = await admin
            .from('fitter_availability')
            .select('id')
            .eq('subcontractor_id', candidate.id)
            .eq('day_of_week', jobDate)
            .eq('available', true)
            .maybeSingle()
          if (!avail) continue

          // Check blocked dates
          if (job.scheduled_date) {
            const dateOnly = job.scheduled_date.slice(0, 10)
            const { data: blocked } = await admin
              .from('fitter_blocked_dates')
              .select('id')
              .eq('subcontractor_id', candidate.id)
              .eq('date', dateOnly)
              .maybeSingle()
            if (blocked) continue
          }

          // Check max_jobs_per_day
          if (candidate.max_jobs_per_day && job.scheduled_date) {
            const dateOnly = job.scheduled_date.slice(0, 10)
            const { count } = await admin
              .from('fitting_jobs')
              .select('id', { count: 'exact', head: true })
              .eq('subcontractor_id', candidate.id)
              .eq('scheduled_date', dateOnly)
              .not('status', 'in', '(cancelled,declined)')
            if ((count ?? 0) >= candidate.max_jobs_per_day) continue
          }
        }

        nextFitter = candidate
        break
      }

      if (nextFitter) {
        // 6a. Route to next fitter
        const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await admin
          .from('fitting_jobs')
          .update({
            subcontractor_id: nextFitter.id,
            status: 'offered',
            offered_at: now,
            offer_expires_at: newExpiry,
            updated_at: now,
          })
          .eq('id', job.id)

        await admin.from('fitting_job_offers').insert({
          fitting_job_id: job.id,
          subcontractor_id: nextFitter.id,
          offered_at: now,
          expires_at: newExpiry,
        })

        // Notify fitter via fitting_messages
        await admin.from('fitting_messages').insert({
          fitting_job_id: job.id,
          sender_type: 'office',
          sender_id: '00000000-0000-0000-0000-000000000000',
          message: `You have a new job offer. Please respond within 24 hours.`,
        })

        routed++
      } else {
        // 6b. No eligible fitter — post to open board
        await admin
          .from('fitting_jobs')
          .update({
            subcontractor_id: null,
            status: 'open_board',
            open_board_at: now,
            updated_at: now,
          })
          .eq('id', job.id)

        // Create urgent CRM task for admin
        if (job.opportunity_id) {
          await admin.from('tasks').insert({
            opportunity_id: job.opportunity_id,
            type: 'follow_up',
            description: `No fitters available for job — posted to open board. Manual reassignment needed.`,
            due_at: now,
            status: 'open',
          })
        }

        boardPosted++
      }
    } catch (err) {
      console.error(`fitter-offer-expiry: error processing job ${job.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, processed: expiredJobs.length, routed, board_posted: boardPosted })
}
