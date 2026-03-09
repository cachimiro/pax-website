'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import PipelineColumn from './PipelineColumn'
import OpportunityCard from './OpportunityCard'
import StageTransitionModal from './StageTransitionModal'
import LostReasonModal from './LostReasonModal'
import { PIPELINE_STAGES, PIPELINE_GROUPS, STAGE_ORDER } from '@/lib/crm/stages'
import { useOpportunities, useMoveOpportunityStage, useProfiles } from '@/lib/crm/hooks'
import { useCurrentProfile } from '@/lib/crm/current-profile'
import { createClient } from '@/lib/supabase/client'
import type { OpportunityStage, OpportunityWithLead, LostReason } from '@/lib/crm/types'
import { assessOpportunityRisk, type RiskLevel } from '@/lib/crm/risk'
import { useAIPreferences } from '@/lib/crm/ai-preferences'
import { TrendingUp, Users, AlertTriangle, PoundSterling, ChevronDown } from 'lucide-react'

function isAdjacentForward(from: OpportunityStage, to: OpportunityStage): boolean {
  const fromIdx = STAGE_ORDER.indexOf(from)
  const toIdx = STAGE_ORDER.indexOf(to)
  return toIdx === fromIdx + 1
}

export function getNextStage(current: OpportunityStage): OpportunityStage | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx < 0 || idx >= STAGE_ORDER.length - 2) return null // skip 'lost'
  const next = STAGE_ORDER[idx + 1]
  return next === 'lost' ? null : next
}

export interface FittingInfo {
  status: string
  fitter_name: string | null
  scheduled_date: string | null
  offer_expires_at: string | null
}

export default function PipelineBoard() {
  const { profile, isAdmin } = useCurrentProfile()
  const { data: opportunities = [], isLoading } = useOpportunities(
    isAdmin ? undefined : { owner_user_id: profile?.id }
  )
  const moveStage = useMoveOpportunityStage()
  const qc = useQueryClient()

  // Designer filter (admin only — non-admins only see their own)
  const { data: allProfiles = [] } = useProfiles()
  const [designerFilter, setDesignerFilter] = useState<string | null>(null)

  // Build designer lookup map: userId → { color, initial }
  const designerMap = useMemo(() => {
    const map: Record<string, { color: string; initial: string }> = {}
    allProfiles.forEach((p) => {
      map[p.id] = {
        color: p.color ?? '#6366f1',
        initial: p.full_name.charAt(0).toUpperCase(),
      }
    })
    return map
  }, [allProfiles])

  // Fetch fitting job data for pipeline cards
  const [fittingMap, setFittingMap] = useState<Record<string, FittingInfo>>({})
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('fitting_jobs')
      .select('opportunity_id, status, scheduled_date, offer_expires_at, subcontractors(name)')
      .not('status', 'in', '("cancelled")')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, FittingInfo> = {}
        for (const j of data) {
          const subRaw = j.subcontractors as unknown
          const sub = Array.isArray(subRaw) ? subRaw[0] as { name: string } | undefined : subRaw as { name: string } | null
          map[j.opportunity_id] = {
            status: j.status,
            fitter_name: sub?.name || null,
            scheduled_date: j.scheduled_date,
            offer_expires_at: j.offer_expires_at,
          }
        }
        setFittingMap(map)
      })
  }, [opportunities]) // re-fetch when opportunities change

  const [activeId, setActiveId] = useState<string | null>(null)
  const [justMovedId, setJustMovedId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{
    opportunity: OpportunityWithLead
    toStage: OpportunityStage
  } | null>(null)
  const [showLostModal, setShowLostModal] = useState<OpportunityWithLead | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { prefs } = useAIPreferences()

  const activeOpportunity = activeId ? opportunities.find((o) => o.id === activeId) ?? null : null
  const filteredOpportunities = useMemo(() =>
    designerFilter
      ? opportunities.filter((o) => o.owner_user_id === designerFilter)
      : opportunities,
  [opportunities, designerFilter])

  const grouped = useMemo(() => {
    const map: Record<OpportunityStage, OpportunityWithLead[]> = {} as Record<OpportunityStage, OpportunityWithLead[]>
    for (const stage of STAGE_ORDER) map[stage] = []
    for (const opp of filteredOpportunities) {
      if (map[opp.stage]) map[opp.stage].push(opp)
    }
    return map
  }, [filteredOpportunities])

  // Compute risk for each opportunity (lightweight — stage-based only)
  const riskMap = useMemo(() => {
    if (!prefs.suggestions_enabled) return {}
    const map: Record<string, { level: RiskLevel; reason: string }> = {}
    for (const opp of filteredOpportunities) {
      const risk = assessOpportunityRisk(opp, prefs.snooze_weekends)
      if (risk.level !== 'none') {
        map[opp.id] = risk
      }
    }
    return map
  }, [filteredOpportunities, prefs.suggestions_enabled, prefs.snooze_weekends])

  const activeOpps = filteredOpportunities.filter((o) => o.stage !== 'lost' && o.stage !== 'closed_not_interested' && o.stage !== 'complete')
  const totalPipelineValue = activeOpps.reduce((sum, o) => sum + (o.value_estimate ?? 0), 0)
  const lostCount = (grouped['lost']?.length ?? 0) + (grouped['closed_not_interested']?.length ?? 0)
  const completedCount = filteredOpportunities.filter((o) => o.stage === 'complete').length

  // Optimistic move — update cache immediately, revert on error
  const optimisticMove = useCallback((oppId: string, toStage: OpportunityStage, lostReason?: LostReason) => {
    const opp = opportunities.find((o) => o.id === oppId)
    if (!opp) return

    // Optimistic cache update
    qc.setQueryData(['opportunities', undefined], (old: OpportunityWithLead[] | undefined) => {
      if (!old) return old
      return old.map((o) => o.id === oppId ? { ...o, stage: toStage, updated_at: new Date().toISOString() } : o)
    })

    const leadName = opp.lead?.name ?? 'Opportunity'
    toast.success(`${leadName} moved to ${toStage.replace(/_/g, ' ')}`)

    // Trigger success flash on the card
    setJustMovedId(oppId)
    setTimeout(() => setJustMovedId(null), 800)

    moveStage.mutate(
      { id: oppId, stage: toStage, lost_reason: lostReason },
      {
        onError: (err) => {
          // Revert optimistic update
          qc.invalidateQueries({ queryKey: ['opportunities'] })
          toast.error(`Failed to move: ${err.message}`)
        },
      }
    )
  }, [opportunities, qc, moveStage])

  // Quick-move: advance one stage forward
  const quickMove = useCallback((opp: OpportunityWithLead) => {
    const next = getNextStage(opp.stage)
    if (!next) return
    optimisticMove(opp.id, next)
  }, [optimisticMove])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const oppId = active.id as string
    const opp = opportunities.find((o) => o.id === oppId)
    if (!opp) return

    // Determine target stage: could be a column (droppable) or another card (sortable)
    const overData = over.data?.current as { stage?: OpportunityStage } | undefined
    let toStage: OpportunityStage

    if (overData?.stage) {
      // Dropped on another card — use that card's stage
      toStage = overData.stage
    } else if (PIPELINE_STAGES.includes(over.id as OpportunityStage)) {
      // Dropped on a column droppable
      toStage = over.id as OpportunityStage
    } else {
      return
    }

    // Same stage — within-column reorder (visual only, no backend call)
    if (opp.stage === toStage) return

    if (toStage === 'lost') {
      setShowLostModal(opp)
      return
    }

    // Adjacent forward move — skip confirmation
    if (isAdjacentForward(opp.stage, toStage)) {
      optimisticMove(oppId, toStage)
      return
    }

    // Non-adjacent or backward — show confirmation
    setPendingMove({ opportunity: opp, toStage })
  }

  function handleConfirmMove() {
    if (!pendingMove) return
    optimisticMove(pendingMove.opportunity.id, pendingMove.toStage)
    setPendingMove(null)
  }

  function handleLostConfirm(reason: LostReason) {
    if (!showLostModal) return
    optimisticMove(showLostModal.id, 'lost', reason)
    setShowLostModal(null)
  }

  return (
    <>
      {/* Stats header */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 mb-5 card-hover-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--warm-400)] font-semibold mb-1">Pipeline Value</p>
              <div className="flex items-baseline gap-1">
                <PoundSterling size={18} className="text-[var(--green-600)]" />
                <span className="text-2xl font-bold text-[var(--warm-900)] font-heading animate-number-pop">
                  {totalPipelineValue.toLocaleString('en-GB')}
                </span>
              </div>
            </div>
            <div className="w-px h-10 bg-[var(--warm-100)]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--warm-800)]">{activeOpps.length}</p>
                <p className="text-[10px] text-[var(--warm-400)]">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users size={14} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--warm-800)]">{completedCount}</p>
                <p className="text-[10px] text-[var(--warm-400)]">Won</p>
              </div>
            </div>
            {lostCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={14} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-600">{lostCount}</p>
                  <p className="text-[10px] text-[var(--warm-400)]">Lost</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Designer filter bar — admin only */}
      {isAdmin && allProfiles.length > 1 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-[var(--warm-400)] font-medium">Filter:</span>
          <button
            onClick={() => setDesignerFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              !designerFilter
                ? 'bg-[var(--warm-800)] text-white border-[var(--warm-800)]'
                : 'bg-white text-[var(--warm-500)] border-[var(--warm-200)] hover:border-[var(--warm-300)]'
            }`}
          >
            All designers
          </button>
          {allProfiles.filter((p) => p.active).map((p) => {
            const color = p.color ?? '#6366f1'
            const isActive = designerFilter === p.id
            return (
              <button
                key={p.id}
                onClick={() => setDesignerFilter(isActive ? null : p.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border-2 transition-all"
                style={{
                  borderColor: color,
                  backgroundColor: isActive ? color : 'white',
                  color: isActive ? 'white' : color,
                }}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.6)' : color }}
                />
                {p.full_name.split(' ')[0]}
              </button>
            )
          })}
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-fade" style={{ minHeight: 'calc(100vh - 300px)' }}>
          {PIPELINE_GROUPS.map((group) => {
            // Collect all opportunities in this group's stages
            const groupOpps = group.stages.flatMap((stage) => grouped[stage] ?? [])
            // Use the first stage as the droppable ID for the column
            const primaryStage = group.stages[0]
            return (
              <PipelineColumn
                key={group.key}
                stage={primaryStage}
                groupLabel={group.label}
                groupStages={group.stages}
                groupColor={group.color}
                opportunities={groupOpps}
                isLoading={isLoading}
                totalPipelineValue={totalPipelineValue}
                onQuickMove={quickMove}
                justMovedId={justMovedId}
                riskMap={riskMap}
                fittingMap={fittingMap}
                designerMap={designerMap}
              />
            )
          })}
        </div>

        <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}>
          {activeOpportunity ? (
            <div className="pipeline-drag-overlay">
              <OpportunityCard opportunity={activeOpportunity} isDragging fittingInfo={fittingMap[activeOpportunity.id]} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <StageTransitionModal
          opportunity={pendingMove.opportunity}
          toStage={pendingMove.toStage}
          onConfirm={handleConfirmMove}
          onCancel={() => setPendingMove(null)}
          isLoading={moveStage.isPending}
          error={moveStage.error?.message ?? null}
        />
      )}

      {showLostModal && (
        <LostReasonModal
          opportunity={showLostModal}
          onConfirm={handleLostConfirm}
          onCancel={() => setShowLostModal(null)}
          isLoading={moveStage.isPending}
        />
      )}
    </>
  )
}
