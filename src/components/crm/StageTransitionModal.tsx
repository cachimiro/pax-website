'use client'

import { STAGES } from '@/lib/crm/stages'
import type { OpportunityStage, OpportunityWithLead } from '@/lib/crm/types'
import { AlertCircle, ArrowRight, X } from 'lucide-react'
import Button from '@/components/crm/Button'
import ModalWrapper from '@/components/crm/ModalWrapper'

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
    <ModalWrapper open={true} onClose={onCancel}>
        {/* Close */}
        <div className="p-6">
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
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={isLoading} className="flex-1">
            Confirm
          </Button>
        </div>
        </div>
    </ModalWrapper>
  )
}
