'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useAIBriefing, type AIBriefing } from '@/lib/crm/ai-hooks'
import { useAIPreferences } from '@/lib/crm/ai-preferences'

interface DailyBriefingProps {
  userName?: string
}

const DISMISS_KEY = 'pax_briefing_dismissed'

export default function DailyBriefing({ userName }: DailyBriefingProps) {
  const { briefingOn } = useAIPreferences()
  const { data: briefing, isLoading, error, refetch } = useAIBriefing(userName, briefingOn)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage for today's dismissal
  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY)
    if (stored === new Date().toISOString().split('T')[0]) {
      setDismissed(true)
    }
  }, [])

  if (!briefingOn || dismissed) return null

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().split('T')[0])
    setDismissed(true)
  }

  const trendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp size={11} className="text-emerald-500" />
    if (trend === 'down') return <TrendingDown size={11} className="text-red-400" />
    return <Minus size={11} className="text-[var(--warm-300)]" />
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 size={14} className="animate-spin text-[var(--green-500)]" />
          <span className="text-xs text-[var(--warm-400)]">Generating your daily briefing...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-[var(--warm-50)] rounded-lg w-3/4 shimmer" />
          <div className="h-3 bg-[var(--warm-50)] rounded-lg w-full shimmer" />
          <div className="h-3 bg-[var(--warm-50)] rounded-lg w-2/3 shimmer" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !briefing) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-[var(--warm-300)]" />
            <span className="text-xs text-[var(--warm-400)]">Briefing unavailable</span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-[10px] text-[var(--green-600)] hover:text-[var(--green-700)] font-medium transition-colors"
          >
            <RefreshCw size={10} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-white to-[var(--green-50)]/30 rounded-2xl border border-[var(--green-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center">
            <Brain size={15} className="text-[var(--green-600)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--warm-800)]">{briefing.greeting}</p>
            <p className="text-[10px] text-[var(--warm-400)]">AI Daily Briefing</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
            title="Refresh briefing"
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
            title="Dismiss for today"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {/* Summary */}
              <p className="text-xs text-[var(--warm-600)] leading-relaxed mb-4">{briefing.summary}</p>

              {/* Highlights */}
              {briefing.highlights?.length > 0 && (
                <div className="flex gap-3 mb-4">
                  {briefing.highlights.map((h, i) => (
                    <div key={i} className="flex-1 bg-white rounded-xl px-3 py-2.5 border border-[var(--warm-50)]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-[var(--warm-400)]">{h.label}</span>
                        {trendIcon(h.trend)}
                      </div>
                      <span className="text-sm font-bold text-[var(--warm-800)] font-heading">{h.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Urgent items */}
              {briefing.urgent_items?.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  {briefing.urgent_items.map((item, i) => (
                    <Link
                      key={i}
                      href={`/crm/leads/${item.lead_id}`}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:shadow-sm ${
                        item.urgency === 'high'
                          ? 'bg-red-50 border border-red-100 hover:border-red-200'
                          : 'bg-amber-50 border border-amber-100 hover:border-amber-200'
                      }`}
                    >
                      <AlertCircle size={12} className={item.urgency === 'high' ? 'text-red-500' : 'text-amber-500'} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-[11px] font-semibold ${item.urgency === 'high' ? 'text-red-700' : 'text-amber-700'}`}>
                          {item.lead_name}
                        </span>
                        <span className={`text-[11px] ml-1.5 ${item.urgency === 'high' ? 'text-red-600' : 'text-amber-600'}`}>
                          — {item.action}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Tip */}
              {briefing.tip_of_the_day && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--green-50)] border border-[var(--green-100)]">
                  <Lightbulb size={12} className="text-[var(--green-600)] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[var(--green-700)] leading-relaxed">{briefing.tip_of_the_day}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
