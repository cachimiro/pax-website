'use client'

import { STAGES, STAGE_ORDER, PIPELINE_GROUPS } from '@/lib/crm/stages'
import type { OpportunityStage } from '@/lib/crm/types'
import { Zap } from 'lucide-react'

interface Props {
  stage: OpportunityStage
}

const CLOSED_STAGES: OpportunityStage[] = ['lost', 'closed_not_interested']
const PAUSED_STAGES: OpportunityStage[] = ['on_hold']

// Only count active pipeline stages for progress %
const ACTIVE_STAGES = STAGE_ORDER.filter(s => !CLOSED_STAGES.includes(s) && !PAUSED_STAGES.includes(s))

export default function StageProgressBar({ stage }: Props) {
  const isClosed = CLOSED_STAGES.includes(stage)
  const isPaused = PAUSED_STAGES.includes(stage)

  const idx = ACTIVE_STAGES.indexOf(stage)
  const pct = isClosed ? 100 : isPaused ? 50 : idx >= 0 ? Math.round(((idx + 1) / ACTIVE_STAGES.length) * 100) : 0

  const barColor = isClosed ? 'bg-red-400' : isPaused ? 'bg-slate-300' : 'bg-[var(--green-500)]'

  // Find which group the current stage belongs to
  const currentGroup = PIPELINE_GROUPS.find(g => g.stages.includes(stage))

  // Show a condensed set of group labels
  const visibleGroups = PIPELINE_GROUPS.filter(g => g.key !== 'paused' && g.key !== 'closed')

  return (
    <div className="space-y-2 mb-4">
      {/* Group labels */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        {visibleGroups.map(g => (
          <span
            key={g.key}
            className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap transition-colors ${
              currentGroup?.key === g.key
                ? 'bg-[var(--green-100)] text-[var(--green-700)]'
                : 'text-[var(--warm-400)]'
            }`}
          >
            {g.label}
          </span>
        ))}
        {isPaused && <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600">On Hold</span>}
        {isClosed && <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-600">Closed</span>}
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-[var(--warm-100)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stage label + automation hint */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--warm-700)]">
          {STAGES[stage]?.label ?? stage}
        </span>
        {STAGES[stage]?.description && (
          <span className="group relative">
            <Zap size={11} className="text-[var(--warm-300)] hover:text-amber-500 cursor-help transition-colors" />
            <span className="absolute right-0 bottom-full mb-1.5 w-64 p-2.5 bg-[var(--warm-900)] text-white text-[10px] rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
              {STAGES[stage].description}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
