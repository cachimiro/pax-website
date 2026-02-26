'use client'

import { STAGES } from '@/lib/crm/stages'
import type { OpportunityStage, OpportunityWithLead } from '@/lib/crm/types'
import { AlertCircle, ArrowRight, X } from 'lucide-react'

interface StageTransitionModalProps {
  opportunity: OpportunityWithLead
  toStage: OpportunityStage
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
  error: string | null
}

export default function StageTransitionModal({
  opportunity,
  toStage,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: StageTransitionModalProps) {
  const fromConfig = STAGES[opportunity.stage]
  const toConfig = STAGES[toStage]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
        >
          <X size={16} />
        </button>

        <h2 className="font-heading text-lg font-semibold text-[var(--warm-900)] mb-1">
          Move Opportunity
        </h2>
        <p className="text-sm text-[var(--warm-500)] mb-5">
          {opportunity.lead?.name ?? 'Unknown lead'}
        </p>

        {/* Stage transition visual */}
        <div className="flex items-center justify-center gap-3 mb-6 py-4 bg-[var(--warm-50)] rounded-xl">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${fromConfig.color} ${fromConfig.textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${fromConfig.dotColor}`} />
            {fromConfig.label}
          </span>
          <ArrowRight size={16} className="text-[var(--warm-300)]" />
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${toConfig.color} ${toConfig.textColor} ring-2 ring-offset-1 ring-[var(--green-200)]`}>
            <span className={`w-1.5 h-1.5 rounded-full ${toConfig.dotColor}`} />
            {toConfig.label}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 mb-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium text-[var(--warm-600)] bg-[var(--warm-50)] hover:bg-[var(--warm-100)] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-[var(--green-700)] hover:bg-[var(--green-900)] rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? 'Moving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
