'use client'

import { useState, useEffect } from 'react'
import { Brain, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Target, Loader2, ThumbsUp, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ActivitySummary from './ActivitySummary'
import type { AIScore, AISuggestion, AIActivitySummary } from '@/lib/crm/ai-hooks'

const LS_KEY = 'pax_ai_insights_expanded'

interface AIInsightsPanelProps {
  aiSuggestion: AISuggestion | undefined
  suggestLoading: boolean
  aiScore: AIScore | undefined
  scoreLoading: boolean
  activitySummary: AIActivitySummary | undefined
  summaryLoading: boolean
  logFeedback?: (outcome: 'accepted' | 'dismissed' | 'snoozed') => void
}

export default function AIInsightsPanel({
  aiSuggestion, suggestLoading,
  aiScore, scoreLoading,
  activitySummary, summaryLoading,
  logFeedback,
}: AIInsightsPanelProps) {
  const [feedbackSent, setFeedbackSent] = useState<'accepted' | 'dismissed' | null>(null)

  function handleFeedback(outcome: 'accepted' | 'dismissed') {
    setFeedbackSent(outcome)
    logFeedback?.(outcome)
  }
  const [expanded, setExpanded] = useState(false)

  // Reset feedback state when a new suggestion arrives
  useEffect(() => { setFeedbackSent(null) }, [aiSuggestion])

  // Persist expand state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored === 'true') setExpanded(true)
    } catch {}
  }, [])

  function toggle() {
    setExpanded(e => {
      const next = !e
      try { localStorage.setItem(LS_KEY, String(next)) } catch {}
      return next
    })
  }

  const isLoading = suggestLoading || scoreLoading || summaryLoading
  const hasContent = aiSuggestion || aiScore || activitySummary

  if (!isLoading && !hasContent) return null

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--warm-50)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center">
            <Brain size={12} className="text-[var(--green-600)]" />
          </div>
          <span className="text-[11px] font-semibold text-[var(--warm-600)]">AI Insights</span>
          {isLoading && (
            <Loader2 size={10} className="animate-spin text-[var(--warm-400)]" />
          )}
          {!expanded && aiSuggestion && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              aiSuggestion.urgency === 'high' ? 'bg-red-100 text-red-700' :
              aiSuggestion.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {aiSuggestion.urgency}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={13} className="text-[var(--warm-300)]" />
          : <ChevronDown size={13} className="text-[var(--warm-300)]" />
        }
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[var(--warm-50)] space-y-3 pt-3">

              {/* AI Suggestion */}
              {suggestLoading ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--warm-100)] bg-[var(--warm-50)]">
                  <Loader2 size={12} className="animate-spin text-[var(--warm-400)]" />
                  <span className="text-xs text-[var(--warm-400)]">Analysing lead...</span>
                </div>
              ) : aiSuggestion ? (
                <div className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${
                  aiSuggestion.urgency === 'high' ? 'text-red-700 bg-red-50 border-red-200' :
                  aiSuggestion.urgency === 'medium' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                  'text-[var(--green-700)] bg-[var(--green-50)] border-[var(--green-200)]'
                }`}>
                  <Sparkles size={13} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{aiSuggestion.action}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{aiSuggestion.reason}</p>
                    {aiSuggestion.script_hint && (
                      <p className="text-[11px] opacity-70 mt-1 italic">&ldquo;{aiSuggestion.script_hint}&rdquo;</p>
                    )}
                    {aiSuggestion.risk && (
                      <p className="flex items-center gap-1 text-[10px] opacity-60 mt-1">
                        <AlertTriangle size={9} /> {aiSuggestion.risk}
                      </p>
                    )}
                    {/* Feedback buttons */}
                    {logFeedback && (
                      <div className="flex items-center gap-2 mt-2">
                        {feedbackSent ? (
                          <span className="text-[10px] opacity-60">
                            {feedbackSent === 'accepted' ? '✅ Marked as done' : '✕ Dismissed'}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleFeedback('accepted')}
                              className="flex items-center gap-1 text-[10px] opacity-60 hover:opacity-100 transition-opacity"
                              title="Mark as done"
                            >
                              <ThumbsUp size={9} /> Done
                            </button>
                            <button
                              onClick={() => handleFeedback('dismissed')}
                              className="flex items-center gap-1 text-[10px] opacity-60 hover:opacity-100 transition-opacity"
                              title="Dismiss suggestion"
                            >
                              <X size={9} /> Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
                    aiSuggestion.urgency === 'high' ? 'bg-red-100 text-red-700' :
                    aiSuggestion.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {aiSuggestion.urgency}
                  </span>
                </div>
              ) : null}

              {/* AI Score */}
              {scoreLoading ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--warm-100)] bg-[var(--warm-50)]">
                  <Loader2 size={12} className="animate-spin text-[var(--warm-400)]" />
                  <span className="text-xs text-[var(--warm-400)]">Scoring lead...</span>
                </div>
              ) : aiScore ? (
                <div className="px-3 py-2.5 rounded-xl border border-[var(--warm-100)] bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={11} className="text-[var(--green-600)]" />
                    <span className="text-[11px] font-semibold text-[var(--warm-700)]">AI Score</span>
                    <span className="text-[10px] text-[var(--warm-400)] ml-auto">GPT</span>
                  </div>
                  <p className="text-xs text-[var(--warm-600)] mb-2">{aiScore.summary}</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {aiScore.factors?.map((f) => (
                      <div key={f.label} className="bg-[var(--warm-50)] rounded-lg px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[var(--warm-500)]">{f.label}</span>
                          <span className="text-[10px] font-bold text-[var(--warm-700)]">{f.score}/{f.max}</span>
                        </div>
                        <div className="w-full h-1 bg-[var(--warm-100)] rounded-full mt-1">
                          <div
                            className="h-1 rounded-full bg-[var(--green-500)] transition-all"
                            style={{ width: `${(f.score / f.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {aiScore.closing_tip && (
                    <div className="flex items-start gap-2 pt-2 border-t border-[var(--warm-50)]">
                      <Target size={10} className="text-[var(--green-600)] mt-0.5 shrink-0" />
                      <p className="text-[11px] text-[var(--warm-600)]">
                        <span className="font-semibold">Tip:</span> {aiScore.closing_tip}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Activity Summary */}
              <ActivitySummary summary={activitySummary} isLoading={summaryLoading} />

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
