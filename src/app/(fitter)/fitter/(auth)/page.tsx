'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, MapPin, Calendar, Clock, ChevronRight, CheckCircle2,
  AlertCircle, Briefcase, PoundSterling, MessageSquare, TrendingUp,
  Navigation, Timer,
} from 'lucide-react'
import Link from 'next/link'
import { format, isToday, isTomorrow, parseISO, differenceInSeconds } from 'date-fns'
import type { FittingJob } from '@/lib/fitter/types'
import type { EarningsSummary } from '@/app/api/fitter/earnings/route'

// ─── Offer expiry countdown ───────────────────────────────────────────────────
function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(() => differenceInSeconds(parseISO(expiresAt), new Date()))
  useEffect(() => {
    const t = setInterval(() => setSecs(differenceInSeconds(parseISO(expiresAt), new Date())), 1000)
    return () => clearInterval(t)
  }, [expiresAt])
  if (secs <= 0) return <span className="text-red-600 text-xs font-semibold">Expired</span>
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const urgent = secs < 3600
  return (
    <span className={`text-xs font-mono font-semibold ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
      {h > 0 ? `${h}h ` : ''}{String(m).padStart(2,'0')}m {String(s).padStart(2,'0')}s
    </span>
  )
}

// ─── Earnings strip ───────────────────────────────────────────────────────────
function EarningsStrip({ earnings }: { earnings: EarningsSummary | null }) {
  if (!earnings) return null
  const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`
  return (
    <div className="bg-gradient-to-r from-[var(--green-700)] to-[var(--green-600)] rounded-2xl p-4 text-white">
      <div className="flex items-center gap-2 mb-3">
        <PoundSterling size={14} className="opacity-80" />
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Earnings</span>
        <Link href="/fitter/earnings" className="ml-auto text-[10px] opacity-70 hover:opacity-100 flex items-center gap-1">
          View all <ChevronRight size={10} />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-lg font-bold">{fmt(earnings.current_month)}</p>
          <p className="text-[10px] opacity-70">This month</p>
        </div>
        <div>
          <p className="text-lg font-bold">{fmt(earnings.last_month)}</p>
          <p className="text-[10px] opacity-70">Last month</p>
        </div>
        <div>
          <p className="text-lg font-bold">{fmt(earnings.all_time)}</p>
          <p className="text-[10px] opacity-70">All time</p>
        </div>
      </div>
    </div>
  )
}

// ─── Today's job card ─────────────────────────────────────────────────────────
function TodayJobCard({ job }: { job: FittingJob }) {
  const statusLabel: Record<string, string> = {
    accepted: 'Accepted', en_route: 'On the way', in_progress: 'In progress',
    assigned: 'Assigned', claimed: 'Claimed',
  }
  const actionLabel: Record<string, string> = {
    accepted: "I'm on my way", en_route: 'Start job', in_progress: 'Continue job',
    assigned: 'View job', claimed: 'View job',
  }
  return (
    <div className="bg-white rounded-2xl border-2 border-[var(--green-400)] shadow-sm overflow-hidden">
      <div className="bg-[var(--green-50)] px-4 py-2 flex items-center gap-2">
        <Calendar size={12} className="text-[var(--green-600)]" />
        <span className="text-xs font-semibold text-[var(--green-700)] uppercase tracking-wider">Today&apos;s Job</span>
        <span className="ml-auto text-[10px] bg-[var(--green-100)] text-[var(--green-700)] px-2 py-0.5 rounded-full font-medium">
          {statusLabel[job.status] ?? job.status}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <p className="font-semibold text-[var(--warm-900)]">{job.customer_name}</p>
        {job.customer_address && (
          <div className="flex items-start gap-2 text-sm text-[var(--warm-600)]">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--green-500)]" />
            <span>{job.customer_address}</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-[var(--warm-500)]">
          {job.scheduled_date && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {format(parseISO(job.scheduled_date), 'HH:mm')}
            </span>
          )}
          {job.estimated_duration_hours > 0 && (
            <span className="flex items-center gap-1">
              <Timer size={11} />
              {job.estimated_duration_hours}h est.
            </span>
          )}
          {job.fitting_fee != null && (
            <span className="flex items-center gap-1">
              <PoundSterling size={11} />
              {Number(job.fitting_fee).toLocaleString('en-GB')}
            </span>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          {job.customer_address && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.customer_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-medium"
            >
              <Navigation size={11} /> Directions
            </a>
          )}
          <Link
            href={`/fitter/job/${job.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-[var(--green-600)] text-white px-3 py-1.5 rounded-lg font-medium"
          >
            {actionLabel[job.status] ?? 'View job'} <ChevronRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Offer card ───────────────────────────────────────────────────────────────
function OfferCard({ job, onRespond }: { job: FittingJob; onRespond: (id: string, accept: boolean) => void }) {
  const [responding, setResponding] = useState(false)
  async function respond(accept: boolean) {
    setResponding(true)
    await onRespond(job.id, accept)
    setResponding(false)
  }
  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-amber-50 px-4 py-2 flex items-center gap-2">
        <AlertCircle size={12} className="text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">New Offer</span>
        {job.offer_expires_at && (
          <span className="ml-auto flex items-center gap-1">
            <Timer size={10} className="text-amber-500" />
            <ExpiryCountdown expiresAt={job.offer_expires_at} />
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <p className="font-semibold text-[var(--warm-900)]">{job.customer_name}</p>
        {job.customer_address && (
          <div className="flex items-start gap-2 text-sm text-[var(--warm-600)]">
            <MapPin size={13} className="mt-0.5 shrink-0" />
            <span>{job.customer_address}</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-[var(--warm-500)]">
          {job.scheduled_date && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {format(parseISO(job.scheduled_date), 'EEE d MMM')}
            </span>
          )}
          {job.estimated_duration_hours > 0 && (
            <span className="flex items-center gap-1"><Timer size={11} />{job.estimated_duration_hours}h</span>
          )}
          {job.fitting_fee != null && (
            <span className="flex items-center gap-1 font-semibold text-[var(--green-700)]">
              <PoundSterling size={11} />£{Number(job.fitting_fee).toLocaleString('en-GB')}
            </span>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => respond(false)}
            disabled={responding}
            className="flex-1 text-xs border border-[var(--warm-200)] text-[var(--warm-600)] px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={() => respond(true)}
            disabled={responding}
            className="flex-1 text-xs bg-[var(--green-600)] text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {responding ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Upcoming job row ─────────────────────────────────────────────────────────
function UpcomingJobRow({ job }: { job: FittingJob }) {
  const dateLabel = job.scheduled_date
    ? isToday(parseISO(job.scheduled_date)) ? 'Today'
    : isTomorrow(parseISO(job.scheduled_date)) ? 'Tomorrow'
    : format(parseISO(job.scheduled_date), 'EEE d MMM')
    : '—'
  return (
    <Link href={`/fitter/job/${job.id}`} className="flex items-center gap-3 py-3 border-b border-[var(--warm-50)] last:border-0">
      <div className="w-10 h-10 rounded-xl bg-[var(--warm-50)] flex items-center justify-center shrink-0">
        <Briefcase size={16} className="text-[var(--warm-400)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--warm-900)] truncate">{job.customer_name}</p>
        <p className="text-xs text-[var(--warm-400)] truncate">{job.customer_address}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-medium text-[var(--warm-700)]">{dateLabel}</p>
        {job.fitting_fee != null && (
          <p className="text-xs text-[var(--green-600)] font-semibold">£{Number(job.fitting_fee).toLocaleString('en-GB')}</p>
        )}
      </div>
      <ChevronRight size={14} className="text-[var(--warm-300)] shrink-0" />
    </Link>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function FitterDashboard() {
  const [jobs, setJobs] = useState<FittingJob[]>([])
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/fitter/jobs')
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch { /* ignore */ }
  }, [])

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch('/api/fitter/earnings')
      if (!res.ok) return
      setEarnings(await res.json())
    } catch { /* ignore */ }
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/fitter/messages/summary')
      if (!res.ok) return
      const data = await res.json()
      const total = (data.summary || []).reduce((n: number, s: { unread_count: number }) => n + s.unread_count, 0)
      setUnreadCount(total)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    Promise.all([fetchJobs(), fetchEarnings(), fetchUnread()]).finally(() => setLoading(false))
  }, [fetchJobs, fetchEarnings, fetchUnread])

  // Realtime: refresh jobs on any change to fitting_jobs
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('fitter-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fitting_jobs' }, () => {
        fetchJobs()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fitting_messages' }, () => {
        fetchUnread()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchJobs, fetchUnread])

  const handleOfferRespond = useCallback(async (jobId: string, accept: boolean) => {
    await fetch(`/api/fitter/jobs/${jobId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: accept ? 'accepted' : 'declined' }),
    })
    fetchJobs()
  }, [fetchJobs])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const offers = jobs.filter(j => j.status === 'offered')
  const todayJobs = jobs.filter(j => j.scheduled_date?.slice(0, 10) === today && ['accepted','en_route','in_progress','assigned','claimed'].includes(j.status))
  const upcoming = jobs.filter(j => j.scheduled_date && j.scheduled_date.slice(0, 10) > today && ['accepted','assigned','claimed'].includes(j.status))
    .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
    .slice(0, 5)

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--warm-900)]">Dashboard</h1>
        <Link href="/fitter/messages" className="relative p-2">
          <MessageSquare size={20} className="text-[var(--warm-500)]" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[var(--green-600)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Earnings strip */}
      <EarningsStrip earnings={earnings} />

      {/* Pending offers */}
      {offers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider">
            Pending Offers ({offers.length})
          </h2>
          {offers.map(job => (
            <OfferCard key={job.id} job={job} onRespond={handleOfferRespond} />
          ))}
        </div>
      )}

      {/* Today's job */}
      {todayJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider">Today</h2>
          {todayJobs.map(job => <TodayJobCard key={job.id} job={job} />)}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--warm-100)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--warm-50)] flex items-center gap-2">
            <TrendingUp size={13} className="text-[var(--warm-400)]" />
            <span className="text-xs font-semibold text-[var(--warm-600)] uppercase tracking-wider">Upcoming</span>
          </div>
          <div className="px-4">
            {upcoming.map(job => <UpcomingJobRow key={job.id} job={job} />)}
          </div>
          <Link href="/fitter/jobs" className="flex items-center justify-center gap-1 text-xs text-[var(--green-600)] font-medium py-3 border-t border-[var(--warm-50)]">
            View all jobs <ChevronRight size={11} />
          </Link>
        </div>
      )}

      {/* Empty state */}
      {offers.length === 0 && todayJobs.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-16 text-[var(--warm-400)]">
          <Briefcase size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No jobs right now</p>
          <p className="text-xs mt-1">Check the <Link href="/fitter/board" className="text-[var(--green-600)] underline">open board</Link> for available work</p>
        </div>
      )}
    </div>
  )
}
