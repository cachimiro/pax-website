import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface MessageSummaryItem {
  job_id: string
  job_code: string
  customer_name: string | null
  status: string
  unread_count: number
  last_message: string | null
  last_message_at: string | null
}

/**
 * Returns all of the fitter's jobs with unread message counts and last message
 * in a single query — replaces the N+1 per-job fetching in the messages page.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })

    // Fetch all non-cancelled jobs for this fitter
    const { data: jobs, error: jobsError } = await admin
      .from('fitting_jobs')
      .select('id, job_code, customer_name, status')
      .eq('subcontractor_id', sub.id)
      .not('status', 'eq', 'cancelled')
      .order('scheduled_date', { ascending: false })

    if (jobsError) throw jobsError
    if (!jobs?.length) return NextResponse.json({ summary: [] })

    const jobIds = jobs.map(j => j.id)

    // Fetch all messages for these jobs in one query
    const { data: messages, error: msgError } = await admin
      .from('fitting_messages')
      .select('fitting_job_id, sender_type, message, read_at, created_at')
      .in('fitting_job_id', jobIds)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    // Aggregate per job
    const msgMap = new Map<string, { unread: number; last: string | null; lastAt: string | null }>()
    for (const msg of messages ?? []) {
      const entry = msgMap.get(msg.fitting_job_id) ?? { unread: 0, last: null, lastAt: null }
      if (msg.sender_type === 'office' && !msg.read_at) entry.unread++
      entry.last = msg.message
      entry.lastAt = msg.created_at
      msgMap.set(msg.fitting_job_id, entry)
    }

    const summary: MessageSummaryItem[] = jobs.map(job => {
      const agg = msgMap.get(job.id) ?? { unread: 0, last: null, lastAt: null }
      return {
        job_id: job.id,
        job_code: job.job_code,
        customer_name: job.customer_name,
        status: job.status,
        unread_count: agg.unread,
        last_message: agg.last,
        last_message_at: agg.lastAt,
      }
    })

    // Sort: unread first, then by last message time
    summary.sort((a, b) => {
      if (a.unread_count !== b.unread_count) return b.unread_count - a.unread_count
      if (!a.last_message_at) return 1
      if (!b.last_message_at) return -1
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    })

    return NextResponse.json({ summary })
  } catch (err: unknown) {
    console.error('messages/summary error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
