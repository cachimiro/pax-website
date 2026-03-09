'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, MapPin, Calendar, Clock, ChevronRight, AlertCircle,
  CheckCircle2, XCircle, Timer, FileText, PoundSterling
} from 'lucide-react'
import Link from 'next/link'
import type { FittingJob } from '@/lib/fitter/types'

type JobGroup = 'offers' | 'today' | 'upcoming' | 'in_progress' | 'completed'

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  offered:     { label: 'Offer',       className: 'bg-purple-100 text-purple-700' },
  assigned:    { label: 'Assigned',    className: 'bg-blue-100 text-blue-700' },
  claimed:     { label: 'Claimed',     className: 'bg-cyan-100 text-cyan-700' },
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
    offers: [],
    today: [],
    upcoming: [],
    in_progress: [],
    completed: [],
  }

  for (const job of jobs) {
    if (job.status === 'offered') {
      grouped.offers.push(job)
    } else if (job.status === 'in_progress') {
      grouped.in_progress.push(job)
    } else if (job.status === 'completed' || job.status === 'signed_off') {
      grouped.completed.push(job)
    } else if (job.status === 'assigned' || job.status === 'accepted' || job.status === 'claimed') {
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
      <div className={`grid gap-3 ${grouped.offers.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {grouped.offers.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{grouped.offers.length}</div>
            <div className="text-[11px] text-purple-500">Offers</div>
          </div>
        )}
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

      {/* Job Offers — shown prominently at top */}
      {grouped.offers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-1.5">
            <Timer size={14} /> Job Offers — Action Required
          </h2>
          <div className="space-y-3">
            {grouped.offers.map(job => (
              <OfferCard key={job.id} job={job} onResponded={fetchJobs} />
            ))}
          </div>
        </div>
      )}

      {/* Job sections */}
      {sections.map(section => {
        const sectionJobs = grouped[section.key]
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

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!expiresAt) return
    function tick() {
      const diff = new Date(expiresAt!).getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        setRemaining('Expired')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return { remaining, expired }
}

function OfferCard({ job, onResponded }: { job: FittingJob; onResponded: () => void }) {
  const { remaining, expired } = useCountdown(job.offer_expires_at || null)
  const [showDetails, setShowDetails] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [responding, setResponding] = useState(false)
  const [responseError, setResponseError] = useState('')

  async function respond(response: 'accepted' | 'declined') {
    setResponding(true)
    setResponseError('')
    try {
      const res = await fetch(`/api/fitter/jobs/${job.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, decline_reason: declineReason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to respond')
      }
      onResponded()
    } catch (err: unknown) {
      setResponseError(err instanceof Error ? err.message : 'Failed to respond')
    } finally {
      setResponding(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
      {/* Header with countdown */}
      <div className="bg-purple-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-purple-500">{job.job_code}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            New Offer
          </span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold ${expired ? 'text-red-600' : 'text-purple-700'}`}>
          <Timer size={12} />
          {remaining || 'No deadline'}
        </div>
      </div>

      {/* Job summary */}
      <div className="p-4">
        <div className="text-sm font-medium text-[var(--warm-900)]">
          {job.customer_name || 'Customer'}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--warm-500)] mt-1">
          {job.customer_address && (
            <span className="flex items-center gap-1"><MapPin size={12} />{job.customer_address}</span>
          )}
          {job.scheduled_date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />{formatDate(job.scheduled_date)} at {formatTime(job.scheduled_date)}
            </span>
          )}
          {job.estimated_duration_hours && (
            <span className="flex items-center gap-1"><Clock size={12} />{job.estimated_duration_hours}h</span>
          )}
          {job.fitting_fee && (
            <span className="flex items-center gap-1"><PoundSterling size={12} />{job.fitting_fee}</span>
          )}
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-2 text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
        >
          <FileText size={12} /> {showDetails ? 'Hide' : 'View'} Job Pack Details
        </button>

        {showDetails && (
          <div className="mt-3 bg-[var(--warm-50)] rounded-lg p-3 space-y-2 text-xs text-[var(--warm-700)]">
            {job.scope_of_work && (
              <div><span className="font-medium">Scope:</span> {job.scope_of_work}</div>
            )}
            {job.access_notes && (
              <div><span className="font-medium">Access:</span> {job.access_notes}</div>
            )}
            {job.parking_info && (
              <div><span className="font-medium">Parking:</span> {job.parking_info}</div>
            )}
            {job.ikea_order_ref && (
              <div><span className="font-medium">IKEA Ref:</span> {job.ikea_order_ref}</div>
            )}
            {job.special_instructions && (
              <div><span className="font-medium">Special Instructions:</span> {job.special_instructions}</div>
            )}
            {job.notes && (
              <div><span className="font-medium">Notes:</span> {job.notes}</div>
            )}
            {job.design_documents && job.design_documents.length > 0 && (
              <div>
                <span className="font-medium">Design Docs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {job.design_documents.map((doc: { name: string; url: string }, i: number) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-purple-600 hover:underline flex items-center gap-0.5">
                      <FileText size={10} />{doc.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {job.measurement_documents && job.measurement_documents.length > 0 && (
              <div>
                <span className="font-medium">Measurements:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {job.measurement_documents.map((doc: { name: string; url: string }, i: number) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-purple-600 hover:underline flex items-center gap-0.5">
                      <FileText size={10} />{doc.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {responseError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1">
            <AlertCircle size={12} /> {responseError}
          </div>
        )}

        {/* Decline reason input */}
        {showDecline && (
          <div className="mt-3 space-y-2">
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Reason for declining (optional but helpful)..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg focus:border-purple-400 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => respond('declined')}
                disabled={responding}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {responding ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Decline
              </button>
              <button
                onClick={() => { setShowDecline(false); setDeclineReason('') }}
                className="px-3 py-2 text-sm text-[var(--warm-600)] border border-[var(--warm-200)] rounded-lg hover:bg-[var(--warm-50)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showDecline && !expired && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => respond('accepted')}
              disabled={responding}
              className="flex-1 px-4 py-2.5 bg-[var(--green-600)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--green-700)] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {responding ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Accept Job
            </button>
            <button
              onClick={() => setShowDecline(true)}
              disabled={responding}
              className="px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              <XCircle size={14} /> Decline
            </button>
          </div>
        )}

        {expired && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 text-center">
            This offer has expired. Contact the office for more information.
          </div>
        )}
      </div>
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
