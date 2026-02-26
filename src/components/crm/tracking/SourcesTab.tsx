'use client'

import type { SourceMetrics } from '@/lib/crm/tracking'
import { Star, TrendingUp, PoundSterling, Users } from 'lucide-react'

interface Props {
  sources: SourceMetrics[]
}

export default function SourcesTab({ sources }: Props) {
  const maxQuality = Math.max(...sources.map((s) => s.qualityScore), 1)

  return (
    <div className="space-y-6">
      {/* Quality score cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => (
          <SourceCard key={source.source} source={source} maxQuality={maxQuality} />
        ))}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold text-[var(--warm-700)]">Channel Comparison</h3>
          <p className="text-[10px] text-[var(--warm-400)] mt-0.5">
            Quality score = 30% qualification rate + 30% deposit rate + 40% revenue per lead (normalized)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-b border-[var(--warm-100)] bg-[var(--warm-50)]">
                <th className="text-left px-5 py-2 text-[var(--warm-500)] font-medium">Source</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Quality</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Visitors</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Leads</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Deposits</th>
                <th className="text-right px-3 py-2 text-[var(--warm-500)] font-medium">Rev/Visitor</th>
                <th className="text-right px-5 py-2 text-[var(--warm-500)] font-medium">Rev/Lead</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source} className="border-b border-[var(--warm-100)] hover:bg-[var(--warm-50)] transition-colors">
                  <td className="px-5 py-2.5 font-medium text-[var(--warm-800)]">{s.source}</td>
                  <td className="text-right px-3 py-2.5">
                    <QualityBadge score={s.qualityScore} />
                  </td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{s.visitors.toLocaleString('en-GB')}</td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{s.enquiries}</td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">{s.deposits}</td>
                  <td className="text-right px-3 py-2.5 text-[var(--warm-700)]">£{s.revenuePerVisitor.toFixed(2)}</td>
                  <td className="text-right px-5 py-2.5 font-semibold text-[var(--warm-800)]">£{s.revenuePerLead.toFixed(0)}</td>
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

function SourceCard({ source, maxQuality }: { source: SourceMetrics; maxQuality: number }) {
  const qualityPct = (source.qualityScore / Math.max(maxQuality, 1)) * 100
  const tier = source.qualityScore >= 60 ? 'high' : source.qualityScore >= 30 ? 'mid' : 'low'
  const tierColors = {
    high: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'High Quality' },
    mid: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-400', label: 'Medium Quality' },
    low: { bg: 'bg-[var(--warm-50)]', border: 'border-[var(--warm-200)]', text: 'text-[var(--warm-500)]', bar: 'bg-[var(--warm-300)]', label: 'Low Quality' },
  }
  const c = tierColors[tier]

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--warm-800)]">{source.source}</h4>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
          {c.label}
        </span>
      </div>

      {/* Quality score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--warm-500)] flex items-center gap-1">
            <Star size={10} /> Quality Score
          </span>
          <span className="text-xs font-bold text-[var(--warm-800)]">{source.qualityScore}</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full ${c.bar} rounded-full transition-all duration-500`}
            style={{ width: `${qualityPct}%` }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric icon={<Users size={10} />} label="Visitors" value={source.visitors.toLocaleString('en-GB')} />
        <MiniMetric icon={<TrendingUp size={10} />} label="Conv Rate" value={`${source.enquiryRate.toFixed(1)}%`} />
        <MiniMetric icon={<PoundSterling size={10} />} label="Rev/Lead" value={`£${source.revenuePerLead.toFixed(0)}`} />
      </div>
    </div>
  )
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center text-[var(--warm-400)] mb-0.5">{icon}</div>
      <p className="text-xs font-semibold text-[var(--warm-800)]">{value}</p>
      <p className="text-[8px] text-[var(--warm-400)]">{label}</p>
    </div>
  )
}

function QualityBadge({ score }: { score: number }) {
  const color = score >= 60
    ? 'text-emerald-700 bg-emerald-50'
    : score >= 30
      ? 'text-amber-700 bg-amber-50'
      : 'text-[var(--warm-500)] bg-[var(--warm-50)]'

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {score}
    </span>
  )
}
