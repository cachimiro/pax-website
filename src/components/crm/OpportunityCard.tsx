'use client'

import { useDraggable } from '@dnd-kit/core'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { GripVertical, Phone, Mail, MessageSquare, ChevronRight } from 'lucide-react'
import type { OpportunityWithLead } from '@/lib/crm/types'
import { STAGES, STAGE_ORDER } from '@/lib/crm/stages'
import Link from 'next/link'

interface OpportunityCardProps {
  opportunity: OpportunityWithLead
  isDragging?: boolean
  onQuickMove?: () => void
}

export default function OpportunityCard({ opportunity, isDragging, onQuickMove }: OpportunityCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: opportunity.id,
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  const daysInStage = differenceInDays(new Date(), new Date(opportunity.updated_at))
  const timeLabel = formatDistanceToNow(new Date(opportunity.updated_at), { addSuffix: false })
  const heat = daysInStage <= 3 ? 'cool' : daysInStage <= 7 ? 'warm' : 'hot'
  const stageConfig = STAGES[opportunity.stage]

  const heatColors = { cool: 'bg-emerald-400', warm: 'bg-amber-400', hot: 'bg-red-400' }

  // Check if there's a next stage
  const stageIdx = STAGE_ORDER.indexOf(opportunity.stage)
  const hasNext = stageIdx >= 0 && stageIdx < STAGE_ORDER.length - 2 && STAGE_ORDER[stageIdx + 1] !== 'lost'
  const nextLabel = hasNext ? STAGES[STAGE_ORDER[stageIdx + 1]]?.label : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden
        transition-all duration-200 group
        ${isDragging
          ? 'shadow-xl ring-2 ring-[var(--green-500)]/30 rotate-[2deg] scale-105 z-50'
          : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-[1px]'
        }
      `}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${stageConfig.dotColor}`} />

      <div className="p-3 pl-4">
        <div className="flex items-start gap-1.5">
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 p-0.5 text-[var(--warm-200)] hover:text-[var(--warm-400)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <GripVertical size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--green-100)] flex items-center justify-center text-[10px] font-bold text-[var(--green-700)] shrink-0">
                {opportunity.lead?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <Link
                href={`/crm/leads/${opportunity.lead_id}`}
                className="text-sm font-semibold text-[var(--warm-800)] hover:text-[var(--green-700)] transition-colors truncate"
              >
                {opportunity.lead?.name ?? 'Unknown'}
              </Link>
            </div>
            {opportunity.lead?.project_type && (
              <p className="text-[11px] text-[var(--warm-400)] truncate mt-0.5 ml-8">
                {opportunity.lead.project_type}
              </p>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1" title={`${daysInStage}d in stage`}>
            <div className={`w-1.5 h-1.5 rounded-full ${heatColors[heat]}`} />
          </div>
        </div>

        {/* Quick actions row */}
        <div className="flex items-center justify-between mt-2 ml-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1">
            {opportunity.lead?.phone && (
              <button className="p-1 rounded text-[var(--warm-300)] hover:text-[var(--green-600)] hover:bg-[var(--green-50)] transition-colors" title="Call">
                <Phone size={11} />
              </button>
            )}
            {opportunity.lead?.email && (
              <button className="p-1 rounded text-[var(--warm-300)] hover:text-[var(--green-600)] hover:bg-[var(--green-50)] transition-colors" title="Email">
                <Mail size={11} />
              </button>
            )}
            <button className="p-1 rounded text-[var(--warm-300)] hover:text-[var(--green-600)] hover:bg-[var(--green-50)] transition-colors" title="Message">
              <MessageSquare size={11} />
            </button>
          </div>

          {/* Quick-move button */}
          {hasNext && onQuickMove && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickMove() }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium text-[var(--green-600)] bg-[var(--green-50)] hover:bg-[var(--green-100)] transition-colors"
              title={`Move to ${nextLabel}`}
            >
              {nextLabel} <ChevronRight size={9} />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--warm-50)]">
          <div className="flex items-center gap-2">
            {opportunity.value_estimate != null && opportunity.value_estimate > 0 && (
              <span className="text-xs font-bold text-[var(--warm-800)] font-heading">
                £{opportunity.value_estimate.toLocaleString('en-GB')}
              </span>
            )}
            <span className={`text-[10px] ${heat === 'hot' ? 'text-red-400 font-medium' : 'text-[var(--warm-300)]'}`}>
              {timeLabel}
            </span>
          </div>
          {opportunity.owner && (
            <div
              className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-[10px] font-semibold text-[var(--green-700)] ring-2 ring-white shrink-0"
              title={opportunity.owner.full_name}
            >
              {opportunity.owner.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
