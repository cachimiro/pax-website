'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Target,
  Loader2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { useAIPipelineHealth, type PipelineHealthReport } from '@/lib/crm/ai-hooks'
import { useAIPreferences } from '@/lib/crm/ai-preferences'
import { format } from 'date-fns'

export default function PipelineHealthCheck() {
  const { healthCheckOn } = useAIPreferences()
  const { data: report, isLoading, error, refetch } = useAIPipelineHealth(healthCheckOn)
  const [expanded, setExpanded] = useState(false)

  if (!healthCheckOn) return null

  // Loading
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-[var(--green-500)]" />
          <span className="text-xs text-[var(--warm-400)]">Analysing pipeline health...</span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 bg-[var(--warm-50)] rounded w-3/4 shimmer" />
          <div className="h-3 bg-[var(--warm-50)] rounded w-full shimmer" />
          <div className="h-3 bg-[var(--warm-50)] rounded w-1/2 shimmer" />
        </div>
      </div>
    )
  }

  // Error
  if (error || !report) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[var(--warm-300)]" />
            <span className="text-xs text-[var(--warm-400)]">Health check unavailable</span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-[10px] text-[var(--green-600)] hover:text-[var(--green-700)] font-medium"
          >
            <RefreshCw size={10} /> Retry
          </button>
        </div>
      </div>
    )
  }

  const healthColors = {
    healthy: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-500', bar: 'bg-emerald-500' },
    attention_needed: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-500', bar: 'bg-amber-500' },
    at_risk: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-500', bar: 'bg-red-500' },
  }
  const colors = healthColors[report.health_label] ?? healthColors.attention_needed

  const healthIcon = report.health_label === 'healthy'
    ? <CheckCircle2 size={16} className="text-emerald-500" />
    : report.health_label === 'at_risk'
    ? <AlertCircle size={16} className="text-red-500" />
    : <AlertTriangle size={16} className="text-amber-500" />

  const trendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp size={10} className="text-emerald-500" />
    if (trend === 'down') return <TrendingDown size={10} className="text-red-400" />
    return <Minus size={10} className="text-[var(--warm-300)]" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Header — always visible */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {healthIcon}
            <div>
              <h3 className="text-sm font-semibold text-[var(--warm-800)]">Pipeline Health</h3>
              <p className="text-[10px] text-[var(--warm-400)]">
                {format(new Date(report.period_start), 'dd MMM')} – {format(new Date(report.period_end), 'dd MMM')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
            >
              <RefreshCw size={12} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Health score bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>
              {report.health_label.replace(/_/g, ' ')}
            </span>
            <span className="text-sm font-bold text-[var(--warm-800)]">{report.health_score}/100</span>
          </div>
          <div className="h-2 bg-[var(--warm-50)] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colors.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${report.health_score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Executive summary */}
        <p className="text-xs text-[var(--warm-600)] leading-relaxed">{report.executive_summary}</p>

        {/* Win/Loss compact */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] text-emerald-600">Won</span>
            <p className="text-sm font-bold text-emerald-700">{report.win_loss.won}</p>
          </div>
          <div className="flex-1 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
            <span className="text-[10px] text-red-600">Lost</span>
            <p className="text-sm font-bold text-red-700">{report.win_loss.lost}</p>
          </div>
          <div className="flex-1 px-3 py-2 rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)]">
            <span className="text-[10px] text-[var(--warm-500)]">Win Rate</span>
            <p className="text-sm font-bold text-[var(--warm-800)]">{report.win_loss.win_rate}%</p>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-[var(--warm-50)] pt-4">

              {/* Metrics */}
              {report.metrics?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-400)] mb-2">Key Metrics</h4>
                  <div className="space-y-2">
                    {report.metrics.map((m, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--warm-50)]/50">
                        <div className="flex items-center gap-2">
                          {trendIcon(m.trend)}
                          <span className="text-xs font-medium text-[var(--warm-700)]">{m.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-[var(--warm-800)]">{m.current}</span>
                          <span className="text-[10px] text-[var(--warm-400)] ml-1.5">vs {m.prior}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottlenecks */}
              {report.bottlenecks?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-400)] mb-2">Bottlenecks</h4>
                  <div className="space-y-2">
                    {report.bottlenecks.map((b, i) => (
                      <div key={i} className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-amber-700">{b.stage}</span>
                          <span className="text-[10px] text-amber-600">{b.count} deals, avg {b.avg_days}d</span>
                        </div>
                        <p className="text-[11px] text-amber-600">{b.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* At-risk deals */}
              {report.at_risk_deals?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-400)] mb-2">At-Risk Deals</h4>
                  <div className="space-y-1.5">
                    {report.at_risk_deals.map((d, i) => (
                      <Link
                        key={i}
                        href={`/crm/leads/${d.lead_id}`}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-50 border border-red-100 hover:border-red-200 transition-all group"
                      >
                        <AlertCircle size={12} className="text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-red-700">{d.lead_name}</span>
                            <span className="text-[10px] text-red-500">{d.stage.replace(/_/g, ' ')} · {d.days_stuck}d</span>
                          </div>
                          <p className="text-[10px] text-red-600 truncate">{d.suggested_action}</p>
                        </div>
                        <ArrowRight size={12} className="text-red-300 group-hover:text-red-500 transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Win/Loss insight */}
              {report.win_loss.insight && (
                <div className="px-3 py-2.5 rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)]">
                  <p className="text-[11px] text-[var(--warm-600)]">
                    {report.win_loss.top_lost_reason !== 'N/A' && (
                      <span className="font-semibold">Top loss reason: {report.win_loss.top_lost_reason}. </span>
                    )}
                    {report.win_loss.insight}
                  </p>
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-400)] mb-2">Recommendations</h4>
                  <div className="space-y-1.5">
                    {report.recommendations.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border ${
                          r.priority === 'high'
                            ? 'bg-[var(--green-50)] border-[var(--green-100)]'
                            : 'bg-[var(--warm-50)] border-[var(--warm-100)]'
                        }`}
                      >
                        <Target size={11} className={`mt-0.5 shrink-0 ${r.priority === 'high' ? 'text-[var(--green-600)]' : 'text-[var(--warm-400)]'}`} />
                        <div>
                          <p className={`text-[11px] font-medium ${r.priority === 'high' ? 'text-[var(--green-700)]' : 'text-[var(--warm-700)]'}`}>
                            {r.action}
                          </p>
                          <p className="text-[10px] text-[var(--warm-400)] mt-0.5">{r.expected_impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
