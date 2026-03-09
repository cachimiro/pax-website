'use client'

import type { ObstacleState } from './types'

interface ObstacleRowProps {
  label: string
  hint: string
  value: ObstacleState
  onChange: (v: ObstacleState) => void
}

const OPTIONS: { value: ObstacleState; label: string; color: string }[] = [
  { value: 'present',     label: 'Present',     color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'not_present', label: 'Not present', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'unknown',     label: 'Unknown',     color: 'bg-[var(--warm-100)] text-[var(--warm-500)] border-[var(--warm-200)]' },
]

export default function ObstacleRow({ label, hint, value, onChange }: ObstacleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--warm-50)] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--warm-800)]">{label}</p>
        <p className="text-xs text-[var(--warm-400)] truncate">{hint}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
              value === opt.value ? opt.color : 'bg-white text-[var(--warm-400)] border-[var(--warm-100)] hover:border-[var(--warm-200)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
