'use client'

import type { SpeedMetric } from '@/lib/crm/tracking'
import { Clock, AlertTriangle, CheckCircle, Minus } from 'lucide-react'

interface Props {
  speeds: SpeedMetric[]
}

export default function SpeedTab({ speeds }: Props) {
  return (
    <div className="space-y-6">
      {/* Speed cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {speeds.map((speed) => (
          <SpeedCard key={speed.label} speed={speed} />
        ))}
      </div>

      {/* Timeline visualization */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-1">Stage Transition Timeline</h3>
        <p className="text-[10px] text-[var(--warm-400)] mb-5">
          Median days between stages vs target. Green = on target, amber = slow, red = needs attention.
        </p>

        <div className="space-y-4">
          {speeds.map((speed) => {
            const maxDays = Math.max(speed.target * 2, speed.median ?? 0, 1)
            const medianWidth = speed.median !== null ? Math.min((speed.median / maxDays) * 100, 100) : 0
            const targetWidth = (speed.target / maxDays) * 100
            const status = getStatus(speed)

            return (
              <div key={speed.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[var(--warm-700)]">{speed.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--warm-400)]">
                      Target: {speed.target}d
                    </span>
                    {speed.median !== null ? (
                      <span className={`text-xs font-semibold ${statusColor(status)}`}>
                        {speed.median}d median
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--warm-300)]">No data</span>
                    )}
                  </div>
                </div>

                <div className="relative h-5 bg-[var(--warm-50)] rounded-full overflow-hidden">
                  {/* Target marker */}
                  <div
                    className="absolute top-0 h-full w-px bg-[var(--warm-300)] z-10"
                    style={{ left: `${targetWidth}%` }}
                  />
                  <div
                    className="absolute -top-0.5 w-2 h-2 bg-[var(--warm-400)] rounded-full z-10 -translate-x-1/2"
                    style={{ left: `${targetWidth}%` }}
                  />

                  {/* Median bar */}
                  {speed.median !== null && (
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${statusBarColor(status)}`}
                      style={{ width: `${medianWidth}%` }}
                    />
                  )}
                </div>

                {/* Scale */}
                <div className="flex justify-between mt-0.5">
                  <span className="text-[8px] text-[var(--warm-300)]">0d</span>
                  <span className="text-[8px] text-[var(--warm-300)]">{Math.round(maxDays)}d</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold text-[var(--warm-700)]">Detailed Timing</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-b border-[var(--warm-100)] bg-[var(--warm-50)]">
                <th className="text-left px-5 py-2 text-[var(--warm-500)] font-medium">Transition</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Median</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Average</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Target</th>
                <th className="text-right px-5 py-2 text-[var(--warm-500)] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {speeds.map((speed) => {
                const status = getStatus(speed)
                return (
                  <tr key={speed.label} className="border-b border-[var(--warm-100)] hover:bg-[var(--warm-50)] transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-[var(--warm-300)]" />
                        <span className="font-medium text-[var(--warm-800)]">{speed.label}</span>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2.5">
                      {speed.median !== null ? (
                        <span className="font-semibold text-[var(--warm-800)]">{speed.median}d</span>
                      ) : (
                        <Minus size={12} className="text-[var(--warm-300)] inline" />
                      )}
                    </td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">
                      {speed.average !== null ? `${speed.average}d` : '—'}
                    </td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-500)]">{speed.target}d</td>
                    <td className="text-right px-5 py-2.5">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SpeedCard({ speed }: { speed: SpeedMetric }) {
  const status = getStatus(speed)
  const borderColor = {
    good: 'border-emerald-200',
    slow: 'border-amber-200',
    bad: 'border-red-200',
    none: 'border-[var(--warm-100)]',
  }[status]

  return (
    <div className={`bg-white rounded-xl border ${borderColor} shadow-sm p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--warm-500)]">{speed.label}</span>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        {speed.median !== null ? (
          <>
            <span className="text-2xl font-bold text-[var(--warm-900)] font-heading">{speed.median}</span>
            <span className="text-sm text-[var(--warm-500)]">days</span>
          </>
        ) : (
          <span className="text-sm text-[var(--warm-300)]">No data yet</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[var(--warm-400)]">
        {speed.average !== null && <span>Avg: {speed.average}d</span>}
        <span>Target: {speed.target}d</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'good' | 'slow' | 'bad' | 'none' }) {
  const config = {
    good: { icon: <CheckCircle size={10} />, label: 'On Target', color: 'text-emerald-600 bg-emerald-50' },
    slow: { icon: <Clock size={10} />, label: 'Slow', color: 'text-amber-600 bg-amber-50' },
    bad: { icon: <AlertTriangle size={10} />, label: 'Needs Attention', color: 'text-red-600 bg-red-50' },
    none: { icon: <Minus size={10} />, label: 'No Data', color: 'text-[var(--warm-400)] bg-[var(--warm-50)]' },
  }
  const c = config[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${c.color}`}>
      {c.icon} {c.label}
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Status = 'good' | 'slow' | 'bad' | 'none'

function getStatus(speed: SpeedMetric): Status {
  if (speed.median === null) return 'none'
  if (speed.median <= speed.target) return 'good'
  if (speed.median <= speed.target * 1.5) return 'slow'
  return 'bad'
}

function statusColor(status: Status): string {
  return { good: 'text-emerald-600', slow: 'text-amber-600', bad: 'text-red-600', none: 'text-[var(--warm-300)]' }[status]
}

function statusBarColor(status: Status): string {
  return { good: 'bg-emerald-500', slow: 'bg-amber-400', bad: 'bg-red-400', none: 'bg-[var(--warm-200)]' }[status]
}
