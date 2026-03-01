'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SidebarTooltipProps {
  label: string
  children: React.ReactNode
  show: boolean
}

export default function SidebarTooltip({ label, children, show }: SidebarTooltipProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <AnimatePresence>
        {show && hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none"
          >
            <div className="bg-[var(--warm-900)] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
              {label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--warm-900)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
