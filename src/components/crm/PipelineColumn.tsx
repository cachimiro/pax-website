'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { STAGES } from '@/lib/crm/stages'
import type { OpportunityStage, OpportunityWithLead } from '@/lib/crm/types'
import type { RiskLevel } from '@/lib/crm/risk'
import OpportunityCard from './OpportunityCard'

interface PipelineColumnProps {
  stage: OpportunityStage
  opportunities: OpportunityWithLead[]
  isLoading: boolean
  totalPipelineValue: number
  onQuickMove: (opp: OpportunityWithLead) => void
  justMovedId: string | null
  riskMap?: Record<string, { level: RiskLevel; reason: string }>
}

export default function PipelineColumn({ stage, opportunities, isLoading, totalPipelineValue, onQuickMove, justMovedId, riskMap = {} }: PipelineColumnProps) {
  const config = STAGES[stage]
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const totalValue = opportunities.reduce((sum, o) => sum + (o.value_estimate ?? 0), 0)
  const valuePct = totalPipelineValue > 0 ? (totalValue / totalPipelineValue) * 100 : 0

  return (
    <div className="flex-shrink-0 w-[280px]" ref={setNodeRef}>
      {/* Column header — glows when drag is over */}
      <div
        className={`
          relative px-3.5 py-3 rounded-t-2xl ${config.color} border border-b-0
          transition-all duration-300
          ${isOver
            ? 'border-[var(--green-500)]/40 shadow-[0_0_16px_rgba(16,148,100,0.12)]'
            : 'border-[var(--warm-100)]'
          }
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2" title={config.description}>
            <span className={`w-2 h-2 rounded-full ${config.dotColor} ${isOver ? 'animate-pulse' : ''}`} />
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

      {/* Drop zone body */}
      <div
        className={`
          rounded-b-2xl border border-t-0 p-2 space-y-2 min-h-[200px]
          transition-all duration-300
          ${isOver
            ? 'bg-[var(--green-50)] border-[var(--green-500)]/30 shadow-[inset_0_2px_8px_rgba(16,148,100,0.06)]'
            : 'bg-[var(--warm-50)]/50 border-[var(--warm-100)]'
          }
        `}
      >
        {/* Drop insertion indicator */}
        {isOver && (
          <div className="flex items-center gap-2 py-1 animate-fade-in">
            <div className="flex-1 h-[2px] bg-[var(--green-400)]/50 rounded-full" />
            <span className="text-[10px] text-[var(--green-500)] font-medium whitespace-nowrap">
              {opportunities.length === 0 ? 'Drop here' : 'Move here'}
            </span>
            <div className="flex-1 h-[2px] bg-[var(--green-400)]/50 rounded-full" />
          </div>
        )}

        <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
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
              <div
                key={opp.id}
                className={`animate-fade-in ${justMovedId === opp.id ? 'animate-success-flash' : ''}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <OpportunityCard
                  opportunity={opp}
                  onQuickMove={() => onQuickMove(opp)}
                  riskLevel={riskMap[opp.id]?.level}
                  riskReason={riskMap[opp.id]?.reason}
                />
              </div>
            ))
          )}
        </SortableContext>
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
