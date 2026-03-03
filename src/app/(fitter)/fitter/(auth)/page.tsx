'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin, Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { FittingJob } from '@/lib/fitter/types'

type JobGroup = 'today' | 'upcoming' | 'in_progress' | 'completed'

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  assigned:    { label: 'Assigned',    className: 'bg-blue-100 text-blue-700' },
  accepted:    { label: 'Accepted',    className: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Completed',   className: 'bg-green-100 text-green-700' },
  signed_off:  { label: 'Signed Off',  className: 'bg-emerald-100 text-emerald-700' },
  rejected:    { label: 'Rejected',    className: 'bg-red-100 text-red-700' },
  cancelled:   { label: 'Cancelled',   className: 'bg-gray-100 text-gray-500' },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

export default function FitterDashboardPage() {
  const [jobs, setJobs] = useState<FittingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchJobs = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch('/api/fitter/jobs')
      if (!res.ok) throw new Error('Failed to load jobs')
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // Group jobs
  const grouped: Record<JobGroup, FittingJob[]> = {
    today: [],
    upcoming: [],
    in_progress: [],
    completed: [],
  }

  for (const job of jobs) {
    if (job.status === 'in_progress') {
      grouped.in_progress.push(job)
    } else if (job.status === 'completed' || job.status === 'signed_off') {
      grouped.completed.push(job)
    } else if (job.status === 'assigned' || job.status === 'accepted') {
      if (job.scheduled_date && isToday(job.scheduled_date)) {
        grouped.today.push(job)
      } else {
        grouped.upcoming.push(job)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
      </div>
    )
  }

  const sections: { key: JobGroup; title: string; emptyText: string }[] = [
    { key: 'today', title: "Today's Jobs", emptyText: 'No jobs scheduled for today' },
    { key: 'in_progress', title: 'In Progress', emptyText: '' },
    { key: 'upcoming', title: 'Upcoming', emptyText: 'No upcoming jobs' },
    { key: 'completed', title: 'Recently Completed', emptyText: '' },
  ]

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center border border-[var(--warm-100)]">
          <div className="text-2xl font-bold text-[var(--green-600)]">{grouped.today.length}</div>
          <div className="text-[11px] text-[var(--warm-500)]">Today</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-[var(--warm-100)]">
          <div className="text-2xl font-bold text-blue-600">{grouped.in_progress.length}</div>
          <div className="text-[11px] text-[var(--warm-500)]">In Progress</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-[var(--warm-100)]">
          <div className="text-2xl font-bold text-[var(--warm-600)]">{grouped.upcoming.length}</div>
          <div className="text-[11px] text-[var(--warm-500)]">Upcoming</div>
        </div>
      </div>

      {/* Job sections */}
      {sections.map(section => {
        const sectionJobs = grouped[section.key]
        // Hide empty completed/in_progress sections
        if (sectionJobs.length === 0 && !section.emptyText) return null

        return (
          <div key={section.key}>
            <h2 className="text-sm font-semibold text-[var(--warm-700)] mb-2">{section.title}</h2>
            {sectionJobs.length === 0 ? (
              <p className="text-sm text-[var(--warm-400)] py-4 text-center">{section.emptyText}</p>
            ) : (
              <div className="space-y-2">
                {sectionJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {jobs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[var(--warm-300)] mb-2">
            <Calendar size={40} className="mx-auto" />
          </div>
          <p className="text-sm text-[var(--warm-500)]">No jobs assigned yet</p>
          <p className="text-xs text-[var(--warm-400)] mt-1">Jobs will appear here when the office assigns them to you</p>
        </div>
      )}
    </div>
  )
}

function JobCard({ job }: { job: FittingJob }) {
  const badge = STATUS_BADGES[job.status] || STATUS_BADGES.assigned

  return (
    <Link href={`/fitter/job/${job.id}`}
      className="block bg-white rounded-xl border border-[var(--warm-100)] p-4 hover:border-[var(--green-300)] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[var(--warm-400)]">{job.job_code}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-sm font-medium text-[var(--warm-900)] truncate">
            {job.customer_name || 'Customer'}
          </div>
          {job.customer_address && (
            <div className="flex items-center gap-1 text-xs text-[var(--warm-500)] mt-1">
              <MapPin size={12} /> <span className="truncate">{job.customer_address}</span>
            </div>
          )}
          {job.scheduled_date && (
            <div className="flex items-center gap-2 text-xs text-[var(--warm-500)] mt-1">
              <Calendar size={12} /> {formatDate(job.scheduled_date)}
              <Clock size={12} /> {formatTime(job.scheduled_date)}
            </div>
          )}
        </div>
        <ChevronRight size={18} className="text-[var(--warm-300)] mt-1 shrink-0" />
      </div>
    </Link>
  )
}
