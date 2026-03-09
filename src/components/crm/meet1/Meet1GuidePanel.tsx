'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, CheckCircle2, Loader2, ClipboardList, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useMeet1Full, useSaveMeet1Notes, useCompleteMeet1 } from '@/lib/crm/hooks'
import { DEFAULT_STATE, NEXT_ACTION_OPTIONS } from './types'
import type { GuideState, FinishType, PackageChoice } from './types'
import {
  Section1Space,
  Section2Package,
  Section3Obstacles,
  Section4Finish,
  Section5Notes,
} from './Meet1GuideSections'

interface Meet1GuidePanelProps {
  opportunityId: string
  bookingId: string
  leadName: string
  onClose: () => void
  onComplete: () => void
}

export default function Meet1GuidePanel({
  opportunityId,
  bookingId,
  leadName,
  onClose,
  onComplete,
}: Meet1GuidePanelProps) {
  const { data: serverData, isLoading } = useMeet1Full(opportunityId)
  const save = useSaveMeet1Notes(opportunityId)
  const complete = useCompleteMeet1(opportunityId)

  const [state, setState] = useState<GuideState>(DEFAULT_STATE)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [finishHint, setFinishHint] = useState<{ finish_type: FinishType; reason: string } | null>(null)
  const [summarising, setSummarising] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // ── Hydrate from server on load ──────────────────────────────────────────
  useEffect(() => {
    if (isLoading || hydrated) return
    setHydrated(true)

    if (serverData?.notes) {
      const n = serverData.notes
      setState({
        room_confirmed: n.room_confirmed ?? '',
        space_constraints: n.space_constraints ?? [],
        photos_on_file: n.photos_on_file ?? false,
        photos_note: n.photos_note ?? '',
        package_confirmed: (n.package_confirmed as PackageChoice) ?? '',
        budget_responsibility_confirmed: n.budget_responsibility_confirmed ?? false,
        obstacle_bed: n.obstacle_bed ?? 'unknown',
        obstacle_radiator: n.obstacle_radiator ?? 'unknown',
        obstacle_curtain_rail: n.obstacle_curtain_rail ?? 'unknown',
        obstacle_coving: n.obstacle_coving ?? 'unknown',
        obstacle_picture_rail: n.obstacle_picture_rail ?? 'unknown',
        obstacle_other: n.obstacle_other ?? '',
        finish_type: (n.finish_type as FinishType) ?? '',
        finish_details: (n.finish_details as GuideState['finish_details']) ?? {},
        call_notes: n.call_notes ?? '',
        next_action: n.next_action ?? '',
      })
    } else if (serverData?.lead) {
      // Pre-fill from booking form data
      const lead = serverData.lead
      const opp = serverData.opp
      const pkgMap: Record<string, PackageChoice> = {
        budget: 'budget', standard: 'paxbespoke', select: 'select',
      }
      const pkg = opp?.package_complexity ? (pkgMap[opp.package_complexity as string] ?? '') : ''
      setState((prev) => ({
        ...prev,
        room_confirmed: (lead.project_type as string) ?? '',
        space_constraints: (lead.space_constraints as string[]) ?? [],
        package_confirmed: pkg as PackageChoice | '',
        next_action: pkg ? NEXT_ACTION_OPTIONS[pkg as PackageChoice] : '',
      }))
    }
  }, [isLoading, serverData, hydrated])

  // ── Fetch AI finish hint once package + constraints are known ────────────
  useEffect(() => {
    if (!hydrated) return
    if (!state.package_confirmed || state.package_confirmed === 'budget') return
    if (state.finish_type) return // already set, don't override

    fetch(`/api/crm/meet1/${opportunityId}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'prefill',
        guideState: {
          space_constraints: state.space_constraints,
          package_confirmed: state.package_confirmed,
        },
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.finish_hint) setFinishHint(d.finish_hint) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.package_confirmed, state.space_constraints.join(','), hydrated])

  // ── Auto-save with 1.5s debounce ─────────────────────────────────────────
  const triggerSave = useCallback((patch: Partial<GuideState>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus('saving')
    debounceRef.current = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      save.mutate(patch as any, {
        onSuccess: () => setSaveStatus('saved'),
        onError: () => { setSaveStatus('idle'); toast.error('Auto-save failed') },
      })
    }, 1500)
  }, [save])

  const handleChange = useCallback((patch: Partial<GuideState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      triggerSave(next)
      return next
    })
  }, [triggerSave])

  // ── AI summarise ─────────────────────────────────────────────────────────
  const handleSummarise = async () => {
    setSummarising(true)
    try {
      const res = await fetch(`/api/crm/meet1/${opportunityId}/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'summarise', guideState: stateRef.current }),
      })
      const data = await res.json()
      if (data.notes_summary) {
        handleChange({ call_notes: data.notes_summary })
        toast.success('Notes summarised — review and edit before completing')
      } else {
        toast.error('Could not generate summary')
      }
    } catch {
      toast.error('Could not generate summary')
    } finally {
      setSummarising(false)
    }
  }

  // ── Complete call ─────────────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!state.call_notes.trim()) {
      toast.error('Add call notes before completing')
      return
    }
    setCompleting(true)
    try {
      const result = await complete.mutateAsync({
        bookingId,
        callNotes: state.call_notes,
      })
      if (result.autoMoved) {
        toast.success(`Call completed — moved to ${result.newStage?.replace(/_/g, ' ')}`)
      } else {
        toast.success('Call completed')
      }
      onComplete()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete call')
    } finally {
      setCompleting(false)
    }
  }

  // ── Progress indicator ────────────────────────────────────────────────────
  const isBudget = state.package_confirmed === 'budget'
  const sectionsDone = [
    !!state.room_confirmed,
    !!state.package_confirmed,
    ['obstacle_bed', 'obstacle_radiator', 'obstacle_curtain_rail', 'obstacle_coving', 'obstacle_picture_rail']
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .every((k) => (state as any)[k] !== 'unknown'),
    isBudget || !!state.finish_type,
    !!state.call_notes.trim(),
  ].filter(Boolean).length
  const totalSections = 5
  const progressPct = Math.round((sectionsDone / totalSections) * 100)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-[var(--warm-50)] shadow-2xl z-[60] flex flex-col border-l border-[var(--warm-100)]"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-b border-[var(--warm-100)] px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--green-50)] flex items-center justify-center">
                <ClipboardList size={16} className="text-[var(--green-700)]" />
              </div>
              <div>
                <h2 className="font-heading text-base font-semibold text-[var(--warm-900)]">
                  Meet 1 Call Guide
                </h2>
                <p className="text-xs text-[var(--warm-400)]">{leadName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Save status */}
              <span className={`text-[10px] font-medium transition-all ${
                saveStatus === 'saving' ? 'text-amber-500' :
                saveStatus === 'saved' ? 'text-emerald-600' : 'text-transparent'
              }`}>
                {saveStatus === 'saving' ? '● Saving…' : saveStatus === 'saved' ? '✓ Saved' : '·'}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[var(--warm-50)] rounded-lg transition-colors"
              >
                <X size={16} className="text-[var(--warm-400)]" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--warm-100)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--green-600)] rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className="text-[10px] text-[var(--warm-400)] font-medium w-12 text-right">
              {sectionsDone}/{totalSections} done
            </span>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[var(--warm-300)]" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            <Section1Space state={state} onChange={handleChange} />
            <Section2Package state={state} onChange={handleChange} />
            <Section3Obstacles state={state} onChange={handleChange} />
            <Section4Finish state={state} onChange={handleChange} finishHint={finishHint} />
            <Section5Notes
              state={state}
              onChange={handleChange}
              onSummarise={handleSummarise}
              summarising={summarising}
            />
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-t border-[var(--warm-100)] px-5 py-4 space-y-2">
          {!state.call_notes.trim() && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertTriangle size={12} />
              Add call notes before completing
            </div>
          )}
          <button
            onClick={handleComplete}
            disabled={completing || !state.call_notes.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--green-700)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--green-800)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {completing
              ? <Loader2 size={16} className="animate-spin" />
              : <CheckCircle2 size={16} />}
            Complete Call
          </button>
          <p className="text-[10px] text-center text-[var(--warm-400)]">
            Saves all data, marks booking complete, and runs AI stage analysis
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
