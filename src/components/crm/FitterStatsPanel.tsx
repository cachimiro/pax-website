'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Loader2, TrendingUp, CheckCircle2, Clock, Wrench, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FitterStatsPanelProps {
  fitterId: string | null
  fitterName: string
  onClose: () => void
}

interface Stats {
  total: number
  active: number
  completed: number
  cancelled: number
  completionRate: number
  avgTurnaroundHours: number | null
  totalEarned: number
}

interface MonthlyPoint {
  month: string
  earned: number
}

interface RecentJob {
  id: string
  job_code: string
  status: string
  scheduled_date: string | null
  completed_at: string | null
  fitting_fee: number | null
  customer_name: string | null
}

const STATUS_COLORS: Record<string, string> = {
  assigned:    'bg-blue-100 text-blue-700',
  accepted:    'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  en_route:    'bg-sky-100 text-sky-700',
  completed:   'bg-green-100 text-green-700',
  signed_off:  'bg-emerald-100 text-emerald-700',
  approved:    'bg-teal-100 text-teal-700',
  rejected:    'bg-red-100 text-red-700',
  cancelled:   'bg-gray-100 text-gray-500',
  offered:     'bg-purple-100 text-purple-700',
  open_board:  'bg-yellow-100 text-yellow-700',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export default function FitterStatsPanel({ fitterId, fitterName, onClose }: FitterStatsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([])
  const [recent, setRecent] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!fitterId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/crm/fitters/${fitterId}/stats`)
      if (!res.ok) throw new Error('Failed to load stats')
      const d = await res.json()
      setStats(d.stats)
      setMonthly(d.monthly)
      setRecent(d.recent)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [fitterId])

  useEffect(() => { load() }, [load])

  const maxEarned = Math.max(...monthly.map(m => m.earned), 1)

  return (
    <AnimatePresence>
      {fitterId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--warm-100)]">
              <div>
                <h2 className="font-semibold text-[var(--warm-900)] text-sm">{fitterName}</h2>
                <p className="text-xs text-[var(--warm-400)]">Performance stats</p>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-[var(--warm-50)] rounded-lg">
                <X size={16} className="text-[var(--warm-500)]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loading && (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--brand)]" />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle size={14} className="shrink-0" /> {error}
                </div>
              )}

              {stats && !loading && (
                <>
                  {/* KPI grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <KpiCard
                      icon={<Wrench size={14} className="text-blue-500" />}
                      label="Total jobs"
                      value={stats.total}
                    />
                    <KpiCard
                      icon={<CheckCircle2 size={14} className="text-emerald-500" />}
                      label="Completion rate"
                      value={`${stats.completionRate}%`}
                      sub={`${stats.completed} of ${stats.total - stats.cancelled}`}
                    />
                    <KpiCard
                      icon={<Clock size={14} className="text-amber-500" />}
                      label="Avg turnaround"
                      value={stats.avgTurnaroundHours != null ? `${stats.avgTurnaroundHours}h` : '—'}
                      sub="assigned → complete"
                    />
                    <KpiCard
                      icon={<TrendingUp size={14} className="text-green-500" />}
                      label="Total earned"
                      value={`£${stats.totalEarned.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    />
                  </div>

                  {/* Active jobs badge */}
                  {stats.active > 0 && (
                    <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      {stats.active} job{stats.active !== 1 ? 's' : ''} currently active
                    </div>
                  )}

                  {/* Monthly earnings bar chart */}
                  {monthly.some(m => m.earned > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider mb-3">
                        Monthly earnings
                      </p>
                      <div className="flex items-end gap-1.5 h-20">
                        {monthly.map(m => (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t-sm bg-[var(--green-200)] transition-all"
                              style={{ height: `${Math.round((m.earned / maxEarned) * 64)}px`, minHeight: m.earned > 0 ? '4px' : '0' }}
                              title={`£${m.earned.toFixed(0)}`}
                            />
                            <span className="text-[9px] text-[var(--warm-400)]">{fmtMonth(m.month)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent jobs */}
                  {recent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider mb-2">
                        Recent jobs
                      </p>
                      <div className="space-y-2">
                        {recent.map(job => (
                          <div key={job.id} className="flex items-start justify-between gap-2 bg-[var(--warm-50)] rounded-xl px-3 py-2.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-medium text-[var(--warm-700)]">{job.job_code}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {job.status.replace('_', ' ')}
                                </span>
                              </div>
                              {job.customer_name && (
                                <p className="text-[11px] text-[var(--warm-500)] truncate mt-0.5">{job.customer_name}</p>
                              )}
                              {(job.completed_at ?? job.scheduled_date) && (
                                <p className="text-[10px] text-[var(--warm-400)] mt-0.5">
                                  {job.completed_at ? `Completed ${fmt(job.completed_at)}` : `Scheduled ${fmt(job.scheduled_date!)}`}
                                </p>
                              )}
                            </div>
                            {job.fitting_fee != null && (
                              <span className="text-xs font-semibold text-[var(--green-700)] shrink-0">
                                £{job.fitting_fee.toFixed(0)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recent.length === 0 && (
                    <p className="text-sm text-center text-[var(--warm-400)] py-6">No jobs yet</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-[var(--warm-50)] rounded-xl p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-[var(--warm-500)]">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-[var(--warm-900)]">{value}</div>
      {sub && <div className="text-[10px] text-[var(--warm-400)]">{sub}</div>}
    </div>
  )
}
