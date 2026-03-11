'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow, differenceInDays, addDays } from 'date-fns'
import { GripVertical, Phone, Mail, MessageSquare, ChevronRight, AlertCircle, Wrench, Timer, Clipboard, Plus, Clock } from 'lucide-react'
import type { OpportunityWithLead } from '@/lib/crm/types'
import type { RiskLevel } from '@/lib/crm/risk'
import type { FittingInfo } from './PipelineBoard'
import { STAGES, STAGE_ORDER } from '@/lib/crm/stages'
import { useCreateTask, useUpdateLead } from '@/lib/crm/hooks'
import Link from 'next/link'

interface OpportunityCardProps {
  opportunity: OpportunityWithLead
  isDragging?: boolean
  onQuickMove?: () => void
  riskLevel?: RiskLevel
  riskReason?: string
  fittingInfo?: FittingInfo
  designerColor?: string
  designerInitial?: string
}

const FITTING_STATUS_DISPLAY: Record<string, { label: string; className: string; icon: typeof Wrench }> = {
  offered:     { label: 'Offered',      className: 'bg-purple-50 text-purple-600 border-purple-200', icon: Timer },
  assigned:    { label: 'Assigned',     className: 'bg-blue-50 text-blue-600 border-blue-200', icon: Wrench },
  claimed:     { label: 'Claimed',      className: 'bg-cyan-50 text-cyan-600 border-cyan-200', icon: Wrench },
  accepted:    { label: 'Accepted',     className: 'bg-indigo-50 text-indigo-600 border-indigo-200', icon: Wrench },
  in_progress: { label: 'On Site',      className: 'bg-amber-50 text-amber-600 border-amber-200', icon: Wrench },
  completed:   { label: 'Done',         className: 'bg-green-50 text-green-600 border-green-200', icon: Wrench },
  signed_off:  { label: 'Signed Off',   className: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Wrench },
  approved:    { label: 'Approved',     className: 'bg-teal-50 text-teal-600 border-teal-200', icon: Wrench },
  open_board:  { label: 'Open Board',   className: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clipboard },
  declined:    { label: 'Declined',     className: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
}

function FittingBadge({ info }: { info: FittingInfo }) {
  const display = FITTING_STATUS_DISPLAY[info.status]
  if (!display) return null
  const Icon = display.icon
  return (
    <div className={`mt-1.5 ml-7 flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium ${display.className}`}>
      <Icon size={10} />
      <span>{display.label}</span>
      {info.fitter_name && <span className="text-[9px] opacity-70">— {info.fitter_name}</span>}
      {info.status === 'open_board' && <span className="text-[9px] opacity-70">— needs fitter</span>}
    </div>
  )
}

export default function OpportunityCard({ opportunity, isDragging: isDraggingOverlay, onQuickMove, riskLevel, riskReason, fittingInfo, designerColor, designerInitial }: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: opportunity.id,
    data: { stage: opportunity.stage },
  })

  const createTask = useCreateTask()
  const updateLead = useUpdateLead()

  // Inline task form state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskDesc, setTaskDesc] = useState('')
  const taskInputRef = useRef<HTMLInputElement>(null)

  // Snooze popover state
  const [showSnooze, setShowSnooze] = useState(false)
  const snoozeRef = useRef<HTMLDivElement>(null)

  // Close snooze popover on outside click
  useEffect(() => {
    if (!showSnooze) return
    function handleClick(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setShowSnooze(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSnooze])

  // Focus task input when form opens
  useEffect(() => {
    if (showTaskForm) requestAnimationFrame(() => taskInputRef.current?.focus())
  }, [showTaskForm])

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskDesc.trim()) return
    createTask.mutate({
      type: 'manual',
      description: taskDesc.trim(),
      opportunity_id: opportunity.id,
      lead_id: opportunity.lead_id,
    })
    setTaskDesc('')
    setShowTaskForm(false)
  }

  function handleSnooze(days: number) {
    const until = addDays(new Date(), days).toISOString()
    updateLead.mutate({ id: opportunity.lead_id, snoozed_until: until })
    setShowSnooze(false)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  const isDragging = isDraggingOverlay || isSortableDragging

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
        relative bg-white rounded-xl border overflow-hidden
        transition-all duration-200 group
        ${isDragging
          ? 'border-[var(--green-500)]/40 shadow-2xl ring-2 ring-[var(--green-500)]/20 rotate-[1.5deg] scale-[1.03] z-50 backdrop-blur-sm'
          : 'border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-[1px] card-hover-border'
        }
      `}
    >
      {/* Designer colour stripe — replaces stage stripe when designer colour is set */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${!designerColor ? stageConfig.dotColor : ''}`}
        style={designerColor ? { backgroundColor: designerColor } : undefined}
      />

      <div className="p-3 pl-4">
        <div className="flex items-start gap-1.5">
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 p-1 -ml-0.5 text-[var(--warm-200)] hover:text-[var(--warm-400)] hover:bg-[var(--warm-50)] rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all shrink-0"
          >
            <GripVertical size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--green-100)] flex items-center justify-center text-[10px] font-bold text-[var(--green-700)] shrink-0">
                {opportunity.lead?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              {/* Designer avatar badge */}
              {designerInitial && designerColor && (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 -ml-1 ring-1 ring-white"
                  style={{ backgroundColor: designerColor }}
                  title={`Assigned to ${designerInitial}`}
                >
                  {designerInitial}
                </div>
              )}
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
            {/* Sub-stage + route/package badges */}
            <div className="flex items-center gap-1 mt-1 ml-8 flex-wrap">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${stageConfig.color} ${stageConfig.textColor}`}>
                {stageConfig.label}
              </span>
              {opportunity.entry_route && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-50 text-slate-500" title={`Entry: ${opportunity.entry_route.replace(/_/g, ' ')}`}>
                  {opportunity.entry_route === 'online_consultation' ? '📹' : opportunity.entry_route === 'video_call' ? '💻' : '🏠'}
                </span>
              )}
              {opportunity.package_complexity && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                  opportunity.package_complexity === 'budget' ? 'bg-green-50 text-green-600' :
                  opportunity.package_complexity === 'standard' ? 'bg-blue-50 text-blue-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {opportunity.package_complexity === 'budget' ? 'B' : opportunity.package_complexity === 'standard' ? 'S' : 'Se'}
                </span>
              )}
              {opportunity.visit_required && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-50 text-violet-500" title="Visit required">
                  📍
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5" title={`${daysInStage}d in stage`}>
            {riskLevel && riskLevel !== 'none' && (
              <div
                className={`relative flex items-center justify-center ${riskLevel === 'high' ? 'text-red-500' : 'text-amber-500'}`}
                title={riskReason}
              >
                <AlertCircle size={13} />
                <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${riskLevel === 'high' ? 'bg-red-500' : 'bg-amber-400'} animate-pulse`} />
              </div>
            )}
            <div className={`w-1.5 h-1.5 rounded-full ${heatColors[heat]}`} />
          </div>
        </div>

        {/* Fitting status indicator */}
        {fittingInfo && <FittingBadge info={fittingInfo} />}

        {/* Quick actions row */}
        <div className={`flex items-center justify-between mt-2 ml-7 transition-opacity ${showTaskForm || showSnooze ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="flex items-center gap-1">
            {opportunity.lead?.phone && (
              <a href={`tel:${opportunity.lead.phone}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded text-[var(--warm-300)] hover:text-[var(--green-600)] hover:bg-[var(--green-50)] transition-colors" title="Call">
                <Phone size={11} />
              </a>
            )}
            {opportunity.lead?.email && (
              <a href={`mailto:${opportunity.lead.email}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded text-[var(--warm-300)] hover:text-[var(--green-600)] hover:bg-[var(--green-50)] transition-colors" title="Email">
                <Mail size={11} />
              </a>
            )}
            {opportunity.lead?.phone && (
              <a href={`https://wa.me/${opportunity.lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-[var(--warm-300)] hover:text-[var(--green-600)] hover:bg-[var(--green-50)] transition-colors" title="WhatsApp">
                <MessageSquare size={11} />
              </a>
            )}

            {/* Add task */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowTaskForm((v) => !v); setShowSnooze(false) }}
              className={`p-1 rounded transition-colors ${showTaskForm ? 'text-[var(--green-600)] bg-[var(--green-50)]' : 'text-[var(--warm-300)] hover:text-[var(--green-600)] hover:bg-[var(--green-50)]'}`}
              title="Add task"
            >
              <Plus size={11} />
            </button>

            {/* Snooze */}
            <div className="relative" ref={snoozeRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowSnooze((v) => !v); setShowTaskForm(false) }}
                className={`p-1 rounded transition-colors ${showSnooze ? 'text-amber-600 bg-amber-50' : 'text-[var(--warm-300)] hover:text-amber-500 hover:bg-amber-50'}`}
                title="Snooze"
              >
                <Clock size={11} />
              </button>
              {showSnooze && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[var(--warm-100)] rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 min-w-[90px]">
                  {[1, 3, 7].map((d) => (
                    <button
                      key={d}
                      onClick={(e) => { e.stopPropagation(); handleSnooze(d) }}
                      className="text-left px-2.5 py-1.5 text-[11px] text-[var(--warm-700)] hover:bg-[var(--warm-50)] rounded-lg transition-colors whitespace-nowrap"
                    >
                      {d === 1 ? 'Tomorrow' : `${d} days`}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

        {/* Inline task creation form */}
        {showTaskForm && (
          <form
            onSubmit={handleCreateTask}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 ml-7 flex items-center gap-1.5"
          >
            <input
              ref={taskInputRef}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Task description…"
              className="flex-1 px-2 py-1 text-[11px] border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none bg-[var(--warm-50)]"
            />
            <button
              type="submit"
              disabled={!taskDesc.trim() || createTask.isPending}
              className="px-2 py-1 text-[10px] font-medium bg-[var(--green-600)] text-white rounded-lg hover:bg-[var(--green-700)] disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </form>
        )}

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
              className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-[10px] font-semibold text-[var(--green-700)] ring-2 ring-white shrink-0 avatar-hover cursor-default"
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

