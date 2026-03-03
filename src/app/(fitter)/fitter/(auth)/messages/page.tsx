'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, MessageSquare, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface JobWithMessages {
  id: string
  job_code: string
  customer_name: string | null
  status: string
  unread_count: number
  last_message: string | null
  last_message_at: string | null
}

export default function FitterMessagesPage() {
  const [jobs, setJobs] = useState<JobWithMessages[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/fitter/jobs')
      if (!res.ok) return
      const data = await res.json()

      // For each job, get message count
      const jobsWithMessages: JobWithMessages[] = []
      for (const job of data.jobs || []) {
        try {
          const msgRes = await fetch(`/api/fitter/jobs/${job.id}/messages`)
          if (msgRes.ok) {
            const msgData = await msgRes.json()
            const messages = msgData.messages || []
            const unread = messages.filter(
              (m: { sender_type: string; read_at: string | null }) =>
                m.sender_type === 'office' && !m.read_at
            ).length
            const last = messages[messages.length - 1]
            jobsWithMessages.push({
              id: job.id,
              job_code: job.job_code,
              customer_name: job.customer_name,
              status: job.status,
              unread_count: unread,
              last_message: last?.message || null,
              last_message_at: last?.created_at || null,
            })
          }
        } catch {
          // Skip jobs with message fetch errors
        }
      }

      // Sort: unread first, then by last message time
      jobsWithMessages.sort((a, b) => {
        if (a.unread_count !== b.unread_count) return b.unread_count - a.unread_count
        if (!a.last_message_at) return 1
        if (!b.last_message_at) return -1
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      })

      setJobs(jobsWithMessages)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-[var(--warm-900)]">Messages</h1>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-[var(--warm-400)]">
          <MessageSquare size={32} className="mx-auto mb-2" />
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <Link key={job.id} href={`/fitter/job/${job.id}/chat`}
              className="block bg-white rounded-xl border border-[var(--warm-100)] p-4 hover:border-[var(--green-300)] transition-colors">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--warm-400)]">{job.job_code}</span>
                    {job.unread_count > 0 && (
                      <span className="text-[10px] font-bold bg-[var(--green-600)] text-white px-1.5 py-0.5 rounded-full">
                        {job.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-[var(--warm-900)] truncate">
                    {job.customer_name || 'Job'}
                  </div>
                  {job.last_message && (
                    <p className="text-xs text-[var(--warm-500)] truncate mt-0.5">{job.last_message}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-[var(--warm-300)] shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
