'use client'

import type { DropoffMetric, LostReasonMetric } from '@/lib/crm/tracking'
import { ArrowDown, XCircle } from 'lucide-react'

interface Props {
  dropoffs: DropoffMetric[]
  lostReasons: LostReasonMetric[]
}

export default function DropoffTab({ dropoffs, lostReasons }: Props) {
  const maxEntered = Math.max(...dropoffs.map((d) => d.entered), 1)

  return (
    <div className="space-y-6">
      {/* Waterfall chart */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-1">Pipeline Waterfall</h3>
        <p className="text-[10px] text-[var(--warm-400)] mb-5">
          How many opportunities reach each stage and where they drop off
        </p>

        <div className="space-y-1">
          {dropoffs.map((stage, i) => {
            const barWidth = Math.max((stage.entered / maxEntered) * 100, 2)
            const isLast = i === dropoffs.length - 1

            return (
              <div key={stage.stage}>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--warm-500)] w-28 text-right truncate">
                    {stage.label}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-8 bg-[var(--warm-50)] rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-[var(--green-600)] rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: `${barWidth}%` }}
                      >
                        {stage.entered > 0 && (
                          <span className="text-[10px] font-semibold text-white">
                            {stage.entered}
                          </span>
                        )}
                      </div>
                    </div>
                    {stage.dropped > 0 && (
                      <span className="text-[10px] text-red-400 w-16 text-right shrink-0">
                        -{stage.dropped} ({stage.dropRate.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Drop arrow between stages */}
                {!isLast && stage.dropped > 0 && (
                  <div className="flex items-center gap-3 py-0.5">
                    <span className="w-28" />
                    <div className="flex items-center gap-1 pl-2">
                      <ArrowDown size={10} className="text-red-300" />
                      <span className="text-[9px] text-red-300">
                        {stage.dropRate.toFixed(0)}% drop
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drop-off rates table */}
        <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-sm font-semibold text-[var(--warm-700)]">Stage Drop-off Rates</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-b border-[var(--warm-100)] bg-[var(--warm-50)]">
                  <th className="text-left px-5 py-2 text-[var(--warm-500)] font-medium">Stage</th>
                  <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Reached</th>
                  <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Dropped</th>
                  <th className="text-right px-5 py-2 text-[var(--warm-500)] font-medium">Drop %</th>
                </tr>
              </thead>
              <tbody>
                {dropoffs.map((d) => (
                  <tr key={d.stage} className="border-b border-[var(--warm-100)] hover:bg-[var(--warm-50)] transition-colors">
                    <td className="px-5 py-2.5 font-medium text-[var(--warm-800)]">{d.label}</td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{d.entered}</td>
                    <td className="text-right px-3 py-2.5">
                      {d.dropped > 0 ? (
                        <span className="text-red-500">-{d.dropped}</span>
                      ) : (
                        <span className="text-[var(--warm-300)]">0</span>
                      )}
                    </td>
                    <td className="text-right px-5 py-2.5">
                      <DropRateBadge rate={d.dropRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lost reasons */}
        <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-1">Lost Reasons</h3>
          <p className="text-[10px] text-[var(--warm-400)] mb-4">
            Why opportunities were marked as lost
          </p>

          {lostReasons.length > 0 ? (
            <div className="space-y-3">
              {lostReasons.map((reason) => {
                const maxPct = Math.max(...lostReasons.map((r) => r.percentage), 1)
                const barWidth = (reason.percentage / maxPct) * 100

                return (
                  <div key={reason.reason}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <XCircle size={12} className="text-red-400" />
                        <span className="text-xs text-[var(--warm-700)] capitalize">
                          {reason.reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--warm-800)]">{reason.count}</span>
                        <span className="text-[10px] text-[var(--warm-400)]">({reason.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[var(--warm-50)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-[var(--warm-300)]">No lost opportunities in this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DropRateBadge({ rate }: { rate: number }) {
  if (rate === 0) return <span className="text-[var(--warm-300)]">—</span>

  const color = rate >= 40
    ? 'text-red-600 bg-red-50'
    : rate >= 20
      ? 'text-amber-600 bg-amber-50'
      : 'text-[var(--warm-500)] bg-[var(--warm-50)]'

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {rate.toFixed(0)}%
    </span>
  )
}
