'use client'

import { motion } from 'framer-motion'
import { Brain, Loader2, Clock, AlertTriangle, ChevronRight, Activity } from 'lucide-react'
import type { AIActivitySummary } from '@/lib/crm/ai-hooks'

interface ActivitySummaryProps {
  summary: AIActivitySummary | undefined
  isLoading: boolean
}

const engagementColors: Record<string, string> = {
  high: 'text-emerald-700 bg-emerald-50',
  medium: 'text-amber-700 bg-amber-50',
  low: 'text-[var(--warm-500)] bg-[var(--warm-50)]',
}

export default function ActivitySummary({ summary, isLoading }: ActivitySummaryProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-3 rounded-xl border border-[var(--warm-100)] bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Loader2 size={12} className="animate-spin text-[var(--green-500)]" />
          <span className="text-[11px] text-[var(--warm-400)]">Summarising activity...</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 bg-[var(--warm-50)] rounded w-full shimmer" />
          <div className="h-2.5 bg-[var(--warm-50)] rounded w-4/5 shimmer" />
          <div className="h-2.5 bg-[var(--warm-50)] rounded w-2/3 shimmer" />
        </div>
      </div>
    )
  }

  if (!summary) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="px-4 py-3 rounded-xl border border-[var(--warm-100)] bg-white card-hover-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-[var(--green-600)]" />
          <span className="text-[11px] font-semibold text-[var(--warm-700)]">Activity Summary</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${engagementColors[summary.engagement_level] ?? engagementColors.medium}`}>
            {summary.engagement_level} engagement
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-[var(--warm-400)]">
            <Clock size={9} /> {summary.days_in_pipeline}d
          </span>
        </div>
      </div>

      {/* Narrative */}
      <p className="text-xs text-[var(--warm-600)] leading-relaxed mb-2.5">{summary.narrative}</p>

      {/* Key milestones */}
      {summary.key_milestones?.length > 0 && (
        <div className="space-y-1 mb-2.5">
          {summary.key_milestones.slice(0, 4).map((m, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <ChevronRight size={9} className="text-[var(--green-500)] shrink-0" />
              <span className="text-[10px] text-[var(--warm-500)]">{m}</span>
            </div>
          ))}
        </div>
      )}

      {/* Next milestone */}
      {summary.next_milestone && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)]">
          <span className="text-[10px] font-medium text-[var(--green-700)]">Next: {summary.next_milestone}</span>
        </div>
      )}

      {/* Risk note */}
      {summary.risk_note && (
        <div className="flex items-start gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
          <AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" />
          <span className="text-[10px] text-amber-600">{summary.risk_note}</span>
        </div>
      )}
    </motion.div>
  )
}
