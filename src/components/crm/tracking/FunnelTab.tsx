'use client'

import type { SourceMetrics } from '@/lib/crm/tracking'

interface Props {
  sources: SourceMetrics[]
}

export default function FunnelTab({ sources }: Props) {
  // Aggregate totals for the overall funnel
  const totals = sources.reduce(
    (acc, s) => ({
      visitors: acc.visitors + s.visitors,
      enquiries: acc.enquiries + s.enquiries,
      qualified: acc.qualified + s.qualified,
      deposits: acc.deposits + s.deposits,
      completed: acc.completed + s.completed,
      revenue: acc.revenue + s.revenue,
    }),
    { visitors: 0, enquiries: 0, qualified: 0, deposits: 0, completed: 0, revenue: 0 }
  )

  const funnelStages = [
    { label: 'Visitors', key: 'visitors' as const },
    { label: 'Enquiries', key: 'enquiries' as const },
    { label: 'Qualified', key: 'qualified' as const },
    { label: 'Deposits', key: 'deposits' as const },
    { label: 'Completed', key: 'completed' as const },
  ]

  // Colors for sources
  const sourceColors = [
    'bg-[var(--green-600)]',
    'bg-blue-500',
    'bg-[var(--orange-500)]',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
  ]

  return (
    <div className="space-y-6">
      {/* Stacked funnel by source */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-1">Funnel by Source</h3>
        <p className="text-[10px] text-[var(--warm-400)] mb-4">
          Each bar shows the contribution of each traffic source at that stage
        </p>

        <div className="space-y-4">
          {funnelStages.map((stage, stageIdx) => {
            const total = totals[stage.key]
            const prevTotal = stageIdx > 0 ? totals[funnelStages[stageIdx - 1].key] : null
            const convPct = prevTotal && prevTotal > 0
              ? ((total / prevTotal) * 100).toFixed(1)
              : null

            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--warm-700)]">{stage.label}</span>
                    <span className="text-xs text-[var(--warm-800)] font-semibold font-heading">
                      {total.toLocaleString('en-GB')}
                    </span>
                  </div>
                  {convPct && (
                    <span className="text-[10px] text-[var(--warm-400)]">
                      {convPct}% from {funnelStages[stageIdx - 1].label.toLowerCase()}
                    </span>
                  )}
                </div>
                <StackedBar
                  segments={sources.map((s, i) => ({
                    label: s.source,
                    value: s[stage.key],
                    color: sourceColors[i % sourceColors.length],
                  }))}
                  total={Math.max(totals.visitors, 1)}
                />
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-[var(--warm-100)]">
          {sources.map((s, i) => (
            <div key={s.source} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${sourceColors[i % sourceColors.length]}`} />
              <span className="text-[10px] text-[var(--warm-500)]">{s.source}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source breakdown table */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold text-[var(--warm-700)]">Source Conversion Rates</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-b border-[var(--warm-100)] bg-[var(--warm-50)]">
                <th className="text-left px-5 py-2 text-[var(--warm-500)] font-medium">Source</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Visitors</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Enquiries</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Enq Rate</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Qualified</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Qual Rate</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Deposits</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Dep Rate</th>
                <th className="text-right px-5 py-2 text-[var(--warm-500)] font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={s.source} className="border-b border-[var(--warm-100)] hover:bg-[var(--warm-50)] transition-colors">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-sm ${sourceColors[i % sourceColors.length]}`} />
                      <span className="font-medium text-[var(--warm-800)]">{s.source}</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{s.visitors.toLocaleString('en-GB')}</td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{s.enquiries}</td>
                  <td className="text-right px-3 py-2.5">
                    <RateBadge value={s.enquiryRate} />
                  </td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{s.qualified}</td>
                  <td className="text-right px-3 py-2.5">
                    <RateBadge value={s.qualifiedRate} />
                  </td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{s.deposits}</td>
                  <td className="text-right px-3 py-2.5">
                    <RateBadge value={s.depositRate} />
                  </td>
                  <td className="text-right px-5 py-2.5 font-semibold text-[var(--warm-800)]">
                    £{s.revenue.toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StackedBar({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[]
  total: number
}) {
  const nonZero = segments.filter((s) => s.value > 0)

  return (
    <div className="h-6 bg-[var(--warm-50)] rounded-full overflow-hidden flex">
      {nonZero.map((seg) => {
        const width = (seg.value / total) * 100
        return (
          <div
            key={seg.label}
            className={`${seg.color} h-full transition-all duration-500 relative group`}
            style={{ width: `${Math.max(width, 0.5)}%` }}
            title={`${seg.label}: ${seg.value}`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-[var(--warm-900)] text-white text-[9px] px-2 py-1 rounded whitespace-nowrap">
                {seg.label}: {seg.value}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RateBadge({ value }: { value: number }) {
  const color = value >= 30 ? 'text-emerald-600 bg-emerald-50' : value >= 10 ? 'text-amber-600 bg-amber-50' : 'text-[var(--warm-400)] bg-[var(--warm-50)]'
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {value < 10 ? value.toFixed(1) : Math.round(value)}%
    </span>
  )
}
