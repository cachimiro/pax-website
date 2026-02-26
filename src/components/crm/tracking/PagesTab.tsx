'use client'

import type { PageMetrics } from '@/lib/crm/tracking'
import { FileText, PoundSterling } from 'lucide-react'

interface Props {
  pages: PageMetrics[]
}

export default function PagesTab({ pages }: Props) {
  const maxRevPerVisitor = Math.max(...pages.map((p) => p.revenuePerVisitor), 1)
  const maxVisitors = Math.max(...pages.map((p) => p.visitors), 1)

  return (
    <div className="space-y-6">
      {/* Top pages by revenue per visitor */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-1">Revenue per Visitor by Page</h3>
        <p className="text-[10px] text-[var(--warm-400)] mb-4">
          Landing pages ranked by revenue generated per unique visitor
        </p>

        <div className="space-y-3">
          {pages.slice(0, 15).map((page, i) => {
            const barWidth = Math.max((page.revenuePerVisitor / maxRevPerVisitor) * 100, 2)
            return (
              <div key={page.page} className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--warm-400)] w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--warm-700)] truncate max-w-[60%]" title={page.page}>
                      {page.page}
                    </span>
                    <span className="text-xs font-semibold text-[var(--warm-800)] font-heading shrink-0 ml-2">
                      £{page.revenuePerVisitor.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--warm-50)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--green-600)] rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
          {pages.length === 0 && (
            <p className="text-xs text-[var(--warm-300)] text-center py-4">No page data yet</p>
          )}
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold text-[var(--warm-700)]">All Landing Pages</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-b border-[var(--warm-100)] bg-[var(--warm-50)]">
                <th className="text-left px-5 py-2 text-[var(--warm-500)] font-medium">Page</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Visitors</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Enquiries</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Conv %</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Qualified</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Deposits</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Revenue</th>
                <th className="text-right px-5 py-2 text-[var(--warm-500)] font-medium">Rev/Visitor</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => {
                const convRate = p.visitors > 0 ? (p.enquiries / p.visitors) * 100 : 0
                return (
                  <tr key={p.page} className="border-b border-[var(--warm-100)] hover:bg-[var(--warm-50)] transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 max-w-[250px]">
                        <FileText size={12} className="text-[var(--warm-300)] shrink-0" />
                        <span className="text-[var(--warm-800)] truncate" title={p.page}>{p.page}</span>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">
                      <div className="flex items-center justify-end gap-2">
                        <span>{p.visitors.toLocaleString('en-GB')}</span>
                        <div className="w-12 h-1.5 bg-[var(--warm-50)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-300 rounded-full"
                            style={{ width: `${(p.visitors / maxVisitors) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{p.enquiries}</td>
                    <td className="text-right px-3 py-2.5">
                      <span className={`text-[10px] font-medium ${convRate >= 3 ? 'text-emerald-600' : convRate >= 1 ? 'text-amber-600' : 'text-[var(--warm-400)]'}`}>
                        {convRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{p.qualified}</td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{p.deposits}</td>
                    <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">£{p.revenue.toLocaleString('en-GB')}</td>
                    <td className="text-right px-5 py-2.5">
                      <span className="font-semibold text-[var(--warm-800)] flex items-center justify-end gap-1">
                        <PoundSterling size={10} className="text-[var(--warm-400)]" />
                        {p.revenuePerVisitor.toFixed(2)}
                      </span>
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
