'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, PoundSterling, TrendingUp, Briefcase } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { EarningsSummary } from '@/app/api/fitter/earnings/route'

interface EarningsJob {
  id: string
  job_code: string
  customer_name: string | null
  scheduled_date: string | null
  fitting_fee: number
  status: string
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

function fmt(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`
}

function MonthLabel(key: string) {
  const [year, month] = key.split('-')
  return `${MONTH_LABELS[month]} ${year.slice(2)}`
}

export default function FitterEarningsPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [jobs, setJobs] = useState<EarningsJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/fitter/earnings').then(r => r.json()),
      fetch('/api/fitter/jobs').then(r => r.json()),
    ]).then(([earningsData, jobsData]) => {
      setSummary(earningsData)
      const paid = (jobsData.jobs || []).filter(
        (j: EarningsJob & { fitting_fee: number | null }) =>
          ['completed', 'signed_off', 'approved'].includes(j.status) && j.fitting_fee != null
      )
      setJobs(paid)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  const maxMonthly = Math.max(...(summary?.monthly.map(m => m.total) ?? [1]), 1)

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/fitter')} className="p-2 hover:bg-[var(--warm-100)] rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-[var(--warm-900)]">Earnings</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'This month', value: summary?.current_month ?? 0, icon: <TrendingUp size={14} /> },
          { label: 'Last month', value: summary?.last_month ?? 0, icon: <PoundSterling size={14} /> },
          { label: 'All time',   value: summary?.all_time ?? 0,    icon: <Briefcase size={14} /> },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-[var(--warm-100)] p-3 text-center">
            <div className="flex justify-center text-[var(--green-600)] mb-1">{card.icon}</div>
            <p className="text-base font-bold text-[var(--warm-900)]">{fmt(card.value)}</p>
            <p className="text-[10px] text-[var(--warm-400)]">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      {summary && summary.monthly.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-4">
          <p className="text-xs font-semibold text-[var(--warm-600)] uppercase tracking-wider mb-4">Last 6 months</p>
          <div className="flex items-end gap-2 h-28">
            {summary.monthly.map(m => {
              const pct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[var(--warm-500)] font-medium">
                    {m.total > 0 ? fmt(m.total) : ''}
                  </span>
                  <div className="w-full rounded-t-md bg-[var(--green-100)] relative" style={{ height: '80px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-[var(--green-500)] rounded-t-md transition-all"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--warm-400)]">{MonthLabel(m.month)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-job table */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--warm-50)]">
          <p className="text-xs font-semibold text-[var(--warm-600)] uppercase tracking-wider">Job Breakdown</p>
        </div>
        {jobs.length === 0 ? (
          <p className="text-sm text-[var(--warm-400)] text-center py-8">No completed jobs yet</p>
        ) : (
          <div className="divide-y divide-[var(--warm-50)]">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--warm-900)] truncate">{job.customer_name || 'Customer'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-[var(--warm-400)]">{job.job_code}</span>
                    {job.scheduled_date && (
                      <span className="text-[10px] text-[var(--warm-400)]">
                        {format(parseISO(job.scheduled_date), 'd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--green-700)]">{fmt(job.fitting_fee)}</p>
                  <p className="text-[10px] text-[var(--warm-400)] capitalize">{job.status.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
