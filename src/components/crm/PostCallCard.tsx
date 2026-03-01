'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  ArrowRight,
  MessageSquare,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Booking, AISuggestion, OpportunityStage } from '@/lib/crm/types'
import { STAGES } from '@/lib/crm/stages'

interface PostCallCardProps {
  booking: Booking
  leadName: string
}

export default function PostCallCard({ booking, leadName }: PostCallCardProps) {
  const [notes, setNotes] = useState(booking.post_call_notes ?? '')
  const [showOverride, setShowOverride] = useState(false)
  const [overrideStage, setOverrideStage] = useState('')
  const [expanded, setExpanded] = useState(true)
  const qc = useQueryClient()

  const suggestion = booking.ai_suggestion

  // Submit notes for AI analysis
  const submitNotes = useMutation({
    mutationFn: async (notesText: string) => {
      const res = await fetch('/api/crm/bookings/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, notes: notesText }),
      })
      if (!res.ok) throw new Error('Failed to submit notes')
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      if (data.auto_moved) {
        toast.success(`Moved to ${STAGES[data.new_stage as OpportunityStage]?.label ?? data.new_stage}`)
        qc.invalidateQueries({ queryKey: ['opportunities'] })
      } else if (data.suggestion) {
        toast.info('AI has a suggestion — review below')
      }
    },
    onError: () => toast.error('Failed to analyse notes'),
  })

  // Confirm/override/dismiss AI suggestion
  const confirmAction = useMutation({
    mutationFn: async (params: { action: string; stage?: string }) => {
      const res = await fetch('/api/crm/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, ...params }),
      })
      if (!res.ok) throw new Error('Failed to confirm')
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['stage-log'] })
      if (data.new_stage) {
        toast.success(`Moved to ${STAGES[data.new_stage as OpportunityStage]?.label ?? data.new_stage}`)
      } else {
        toast.info('Suggestion dismissed')
      }
    },
    onError: () => toast.error('Action failed'),
  })

  // Only show for completed bookings that need notes or have suggestions
  const needsNotes = booking.outcome === 'completed' && !booking.post_call_notes && !suggestion
  const hasSuggestion = !!suggestion && suggestion.stage !== 'no_change'
  const hasNoChangeSuggestion = !!suggestion && suggestion.stage === 'no_change'

  if (!needsNotes && !suggestion) return null

  const typeLabel = booking.type === 'call1' ? 'Discovery Call' : booking.type === 'call2' ? 'Design Call' : 'Onboarding Visit'

  const sentimentIcon = suggestion?.sentiment === 'positive'
    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
    : suggestion?.sentiment === 'negative'
    ? <XCircle className="w-4 h-4 text-red-500" />
    : <AlertTriangle className="w-4 h-4 text-amber-500" />

  const confidenceColor = (suggestion?.confidence ?? 0) >= 90
    ? 'text-emerald-600 bg-emerald-50'
    : (suggestion?.confidence ?? 0) >= 70
    ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-blue-200 bg-blue-50/50 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">
            {needsNotes ? `How did the ${typeLabel.toLowerCase()} go?` : 'AI Stage Suggestion'}
          </span>
          {suggestion && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceColor}`}>
              {suggestion.confidence}% confident
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Notes input (if needed) */}
              {needsNotes && (
                <>
                  <p className="text-xs text-blue-700">
                    Add your notes from the call with {leadName}. The AI will suggest the next pipeline stage.
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`How did the ${typeLabel.toLowerCase()} with ${leadName} go? What was discussed? Any objections or next steps?`}
                    rows={4}
                    className="w-full text-sm border border-blue-200 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-300 resize-none"
                  />
                  <button
                    onClick={() => submitNotes.mutate(notes)}
                    disabled={!notes.trim() || submitNotes.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitNotes.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Analyse Notes
                  </button>
                </>
              )}

              {/* Notes already submitted, show them */}
              {booking.post_call_notes && (
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3 h-3 text-blue-400" />
                    <span className="text-xs font-medium text-blue-600">Your notes</span>
                  </div>
                  <p className="text-xs text-[var(--warm-600)] whitespace-pre-wrap">{booking.post_call_notes}</p>
                </div>
              )}

              {/* AI Suggestion */}
              {suggestion && (
                <div className="space-y-3">
                  {/* Sentiment + reasoning */}
                  <div className="flex items-start gap-2">
                    {sentimentIcon}
                    <div>
                      <p className="text-sm text-[var(--warm-800)]">{suggestion.reasoning}</p>
                    </div>
                  </div>

                  {/* Objections */}
                  {suggestion.objections.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                      <p className="text-xs font-medium text-amber-700 mb-1">Objections noted:</p>
                      <ul className="text-xs text-amber-600 space-y-0.5">
                        {suggestion.objections.map((obj, i) => (
                          <li key={i}>• {obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up actions */}
                  {suggestion.follow_up_actions.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-xs font-medium text-blue-700 mb-1">Suggested next steps:</p>
                      <ul className="text-xs text-[var(--warm-600)] space-y-0.5">
                        {suggestion.follow_up_actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Target className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action buttons */}
                  {hasSuggestion && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => confirmAction.mutate({ action: 'confirm' })}
                        disabled={confirmAction.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {confirmAction.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        Move to {STAGES[suggestion.stage as OpportunityStage]?.label ?? suggestion.stage}
                      </button>

                      <button
                        onClick={() => setShowOverride(!showOverride)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[var(--warm-200)] text-sm font-medium text-[var(--warm-700)] rounded-lg hover:bg-[var(--warm-50)] transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Choose different stage
                      </button>

                      <button
                        onClick={() => confirmAction.mutate({ action: 'dismiss' })}
                        disabled={confirmAction.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* No-change suggestion: just show reasoning + dismiss */}
                  {hasNoChangeSuggestion && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => confirmAction.mutate({ action: 'dismiss' })}
                        disabled={confirmAction.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[var(--warm-200)] text-sm font-medium text-[var(--warm-700)] rounded-lg hover:bg-[var(--warm-50)] transition-colors"
                      >
                        Got it
                      </button>
                      <button
                        onClick={() => setShowOverride(!showOverride)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors"
                      >
                        Move to a stage anyway
                      </button>
                    </div>
                  )}

                  {/* Override stage picker */}
                  <AnimatePresence>
                    {showOverride && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 pt-2">
                          <select
                            value={overrideStage}
                            onChange={(e) => setOverrideStage(e.target.value)}
                            className="text-sm border border-[var(--warm-200)] rounded-lg px-3 py-2 bg-white"
                          >
                            <option value="">Select stage...</option>
                            {Object.entries(STAGES).map(([key, config]) => (
                              <option key={key} value={key}>{config.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (overrideStage) {
                                confirmAction.mutate({ action: 'override', stage: overrideStage })
                              }
                            }}
                            disabled={!overrideStage || confirmAction.isPending}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            Move
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
