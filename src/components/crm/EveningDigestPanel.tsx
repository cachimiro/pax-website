'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Loader2,
  RefreshCw,
  X,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { useAIEveningDigest } from '@/lib/crm/ai-hooks'
import { useAIPreferences } from '@/lib/crm/ai-preferences'

interface EveningDigestPanelProps {
  userName?: string
}

const DISMISS_KEY = 'pax_evening_digest_dismissed'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function EveningDigestPanel({ userName }: EveningDigestPanelProps) {
  const { briefingOn } = useAIPreferences()
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Only show after 16:00 local time
  const hour = new Date().getHours()
  const isEvening = hour >= 16

  const { data: digest, isLoading, error, refetch } = useAIEveningDigest(
    userName,
    briefingOn && isEvening && !dismissed,
  )

  // Check today's dismissal
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const stored = localStorage.getItem(DISMISS_KEY)
    if (stored === today) setDismissed(true)
    else if (stored) localStorage.removeItem(DISMISS_KEY)
  }, [])

  if (!briefingOn || !isEvening || dismissed) return null

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10))
    setDismissed(true)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 mb-5">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-[var(--green-500)]" />
          <span className="text-xs text-[var(--warm-400)]">Generating your evening digest...</span>
        </div>
      </div>
    )
  }

  if (error || !digest) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-4 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--warm-400)]">Evening digest unavailable</span>
          <button onClick={() => refetch()} className="flex items-center gap-1 text-[10px] text-[var(--green-600)] font-medium">
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
      className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl border border-indigo-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
            <Moon size={15} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--warm-800)]">{digest.headline}</p>
            <p className="text-[10px] text-[var(--warm-400)]">AI Evening Digest</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => refetch()} className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all" title="Refresh">
            <RefreshCw size={12} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all">
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button onClick={handleDismiss} className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all" title="Dismiss for today">
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
            <div className="px-5 pb-4 space-y-4">
              {/* Today summary */}
              <p className="text-xs text-[var(--warm-600)] leading-relaxed">{digest.today_summary}</p>

              {/* Wins */}
              {digest.wins_today?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider">Today&apos;s wins</p>
                  {digest.wins_today.map((win, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-[11px] text-[var(--warm-700)]">{win}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tomorrow prep */}
              {digest.tomorrow_prep?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider">Prep for tomorrow</p>
                  {digest.tomorrow_prep.map((item, i) => {
                    const hasId = UUID_RE.test(item.lead_id ?? '')
                    const inner = (
                      <>
                        <ArrowRight size={10} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-indigo-700">{item.lead_name}</span>
                          <span className="text-[11px] text-indigo-600 ml-1.5">— {item.action}</span>
                          {item.context && (
                            <p className="text-[10px] text-[var(--warm-400)] mt-0.5">{item.context}</p>
                          )}
                        </div>
                      </>
                    )
                    const cls = 'flex items-start gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100'
                    return hasId ? (
                      <Link key={i} href={`/crm/leads/${item.lead_id}`} className={`${cls} hover:border-indigo-200 transition-colors`}>{inner}</Link>
                    ) : (
                      <div key={i} className={cls}>{inner}</div>
                    )
                  })}
                </div>
              )}

              {/* Watch list */}
              {digest.watch_list?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider">Watch list</p>
                  {digest.watch_list.map((item, i) => {
                    const hasId = UUID_RE.test(item.lead_id ?? '')
                    const inner = (
                      <>
                        <AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-amber-700">{item.lead_name}</span>
                          <span className="text-[11px] text-amber-600 ml-1.5">— {item.concern}</span>
                        </div>
                      </>
                    )
                    const cls = 'flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100'
                    return hasId ? (
                      <Link key={i} href={`/crm/leads/${item.lead_id}`} className={`${cls} hover:border-amber-200 transition-colors`}>{inner}</Link>
                    ) : (
                      <div key={i} className={cls}>{inner}</div>
                    )
                  })}
                </div>
              )}

              {/* Close of day tip */}
              {digest.close_of_day_tip && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--green-50)] border border-[var(--green-100)]">
                  <Lightbulb size={12} className="text-[var(--green-600)] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[var(--green-700)] leading-relaxed">{digest.close_of_day_tip}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
