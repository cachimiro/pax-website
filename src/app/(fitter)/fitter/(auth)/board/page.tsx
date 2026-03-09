'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, MapPin, Calendar, Clock, PoundSterling, AlertCircle,
  Clipboard, CheckCircle2
} from 'lucide-react'

interface BoardJob {
  id: string
  job_code: string
  status: string
  scheduled_date: string | null
  customer_name: string | null
  customer_address: string | null
  fitting_fee: number | null
  estimated_duration_hours: number | null
  scope_of_work: string | null
  open_board_at: string | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function OpenBoardPage() {
  const [jobs, setJobs] = useState<BoardJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchBoard = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch('/api/fitter/jobs/board')
      if (!res.ok) throw new Error('Failed to load board')
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBoard() }, [fetchBoard])

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--warm-900)] flex items-center gap-2">
          <Clipboard size={20} className="text-yellow-600" /> Open Jobs Board
        </h1>
        <p className="text-xs text-[var(--warm-500)] mt-0.5">
          Jobs available to claim. First come, first served.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <Clipboard size={40} className="mx-auto text-[var(--warm-300)] mb-2" />
          <p className="text-sm text-[var(--warm-500)]">No jobs on the board right now</p>
          <p className="text-xs text-[var(--warm-400)] mt-1">Check back later for available jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <BoardJobCard key={job.id} job={job} onClaimed={fetchBoard} />
          ))}
        </div>
      )}
    </div>
  )
}

function BoardJobCard({ job, onClaimed }: { job: BoardJob; onClaimed: () => void }) {
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [claimed, setClaimed] = useState(false)

  async function handleClaim() {
    setClaiming(true)
    setClaimError('')
    try {
      const res = await fetch('/api/fitter/jobs/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to claim')
      }
      setClaimed(true)
      setTimeout(onClaimed, 1500)
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : 'Failed to claim')
    } finally {
      setClaiming(false)
    }
  }

  if (claimed) {
    return (
      <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
        <CheckCircle2 size={24} className="mx-auto text-green-600 mb-1" />
        <p className="text-sm font-medium text-green-700">Job Claimed!</p>
        <p className="text-xs text-green-600">Check your Jobs tab for details</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-yellow-200 overflow-hidden">
      {/* Header */}
      <div className="bg-yellow-50 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-mono text-yellow-700">{job.job_code}</span>
        {job.open_board_at && (
          <span className="text-[10px] text-yellow-600">Posted {timeAgo(job.open_board_at)}</span>
        )}
      </div>

      <div className="p-4">
        <div className="text-sm font-medium text-[var(--warm-900)]">
          {job.customer_name || 'Customer'}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--warm-500)] mt-1.5">
          {job.customer_address && (
            <span className="flex items-center gap-1"><MapPin size={12} />{job.customer_address}</span>
          )}
          {job.scheduled_date && (
            <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(job.scheduled_date)}</span>
          )}
          {job.estimated_duration_hours && (
            <span className="flex items-center gap-1"><Clock size={12} />{job.estimated_duration_hours}h</span>
          )}
          {job.fitting_fee && (
            <span className="flex items-center gap-1 font-medium text-green-700">
              <PoundSterling size={12} />{job.fitting_fee}
            </span>
          )}
        </div>

        {job.scope_of_work && (
          <p className="text-xs text-[var(--warm-600)] mt-2 line-clamp-2">{job.scope_of_work}</p>
        )}

        {claimError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1">
            <AlertCircle size={12} /> {claimError}
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="mt-3 w-full px-4 py-2.5 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
        >
          {claiming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Claim This Job
        </button>
      </div>
    </div>
  )
}
