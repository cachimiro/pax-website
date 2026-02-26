'use client'

import { useDroppable } from '@dnd-kit/core'
import { STAGES } from '@/lib/crm/stages'
import type { OpportunityStage, OpportunityWithLead } from '@/lib/crm/types'
import OpportunityCard from './OpportunityCard'

interface PipelineColumnProps {
  stage: OpportunityStage
  opportunities: OpportunityWithLead[]
  isLoading: boolean
  totalPipelineValue: number
  onQuickMove: (opp: OpportunityWithLead) => void
}

export default function PipelineColumn({ stage, opportunities, isLoading, totalPipelineValue, onQuickMove }: PipelineColumnProps) {
  const config = STAGES[stage]
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const totalValue = opportunities.reduce((sum, o) => sum + (o.value_estimate ?? 0), 0)
  const valuePct = totalPipelineValue > 0 ? (totalValue / totalPipelineValue) * 100 : 0

  return (
    <div className="flex-shrink-0 w-[280px]" ref={setNodeRef}>
      <div className={`relative px-3.5 py-3 rounded-t-2xl ${config.color} border border-b-0 border-[var(--warm-100)]`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
            <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
          </div>
          <span className={`text-xs font-bold ${config.textColor} bg-white/60 rounded-full w-6 h-6 flex items-center justify-center`}>
            {opportunities.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totalValue > 0 && (
            <span className={`text-[11px] font-semibold ${config.textColor}`}>
              £{totalValue.toLocaleString('en-GB')}
            </span>
          )}
          {valuePct > 0 && (
            <div className="flex-1 h-1 bg-white/40 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.dotColor} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(valuePct, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div
        className={`
          rounded-b-2xl border border-t-0 p-2 space-y-2 min-h-[200px]
          transition-all duration-300
          ${isOver
            ? 'bg-[var(--green-50)] border-[var(--green-500)]/30 shadow-inner'
            : 'bg-[var(--warm-50)]/50 border-[var(--warm-100)]'
          }
        `}
      >
        {isOver && opportunities.length === 0 && (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-[var(--green-400)]/40 rounded-xl">
            <span className="text-xs text-[var(--green-500)] font-medium">Drop here</span>
          </div>
        )}

        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : opportunities.length === 0 && !isOver ? (
          <div className="flex items-center justify-center h-24 text-xs text-[var(--warm-300)]">
            No opportunities
          </div>
        ) : (
          opportunities.map((opp, i) => (
            <div key={opp.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <OpportunityCard opportunity={opp} onQuickMove={() => onQuickMove(opp)} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--warm-100)]" />
      <div className="pl-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-[var(--warm-100)] rounded-full shimmer" />
          <div className="h-3.5 bg-[var(--warm-100)] rounded w-24 shimmer" />
        </div>
        <div className="h-2.5 bg-[var(--warm-50)] rounded w-16 mb-3 ml-8 shimmer" />
        <div className="flex items-center justify-between pt-2 border-t border-[var(--warm-50)]">
          <div className="h-3 bg-[var(--warm-100)] rounded w-14 shimmer" />
          <div className="w-6 h-6 bg-[var(--warm-100)] rounded-full shimmer" />
        </div>
      </div>
    </div>
  )
}
