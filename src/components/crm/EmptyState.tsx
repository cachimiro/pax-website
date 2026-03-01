'use client'

import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  tip?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, tip, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-2xl bg-[var(--warm-50)] border border-[var(--warm-100)] flex items-center justify-center mb-4"
      >
        <span className="text-[var(--warm-300)]">{icon}</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-sm font-medium text-[var(--warm-600)] text-center"
      >
        {title}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xs text-[var(--warm-400)] mt-1 text-center max-w-xs"
      >
        {description}
      </motion.p>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4"
        >
          {action}
        </motion.div>
      )}

      {tip && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] text-[var(--warm-300)] mt-6 flex items-center gap-1"
        >
          <span className="text-[var(--warm-200)]">💡</span> {tip}
        </motion.p>
      )}
    </div>
  )
}
