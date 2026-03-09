'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SectionShellProps {
  number: number
  title: string
  complete: boolean
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function SectionShell({ number, title, complete, defaultOpen = false, children }: SectionShellProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`rounded-xl border transition-colors ${complete ? 'border-emerald-200 bg-emerald-50/30' : 'border-[var(--warm-100)] bg-white'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
          complete ? 'bg-emerald-500 text-white' : 'bg-[var(--warm-100)] text-[var(--warm-500)]'
        }`}>
          {complete ? <CheckCircle2 size={14} /> : number}
        </div>
        <span className={`text-sm font-semibold flex-1 ${complete ? 'text-emerald-700' : 'text-[var(--warm-800)]'}`}>
          {title}
        </span>
        {open ? <ChevronUp size={14} className="text-[var(--warm-400)]" /> : <ChevronDown size={14} className="text-[var(--warm-400)]" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--warm-100)]">
              <div className="pt-3">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
