'use client'

import { useState } from 'react'
import { LOST_REASONS } from '@/lib/crm/stages'
import type { OpportunityWithLead, LostReason } from '@/lib/crm/types'
import { X, AlertTriangle } from 'lucide-react'
import Button from '@/components/crm/Button'
import ModalWrapper from '@/components/crm/ModalWrapper'

interface LostReasonModalProps {
  opportunity: OpportunityWithLead
  onConfirm: (reason: LostReason) => void
  onCancel: () => void
  isLoading: boolean
}

export default function LostReasonModal({
  opportunity,
  onConfirm,
  onCancel,
  isLoading,
}: LostReasonModalProps) {
  const [reason, setReason] = useState<LostReason | ''>('')

  return (
    <ModalWrapper open={true} onClose={onCancel}>
      <div className="p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-[var(--warm-900)]">
              Mark as Lost
            </h2>
            <p className="text-sm text-[var(--warm-500)]">
              {opportunity.lead?.name ?? 'Unknown lead'}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[var(--warm-700)] mb-2">
            Why was this opportunity lost?
          </label>
          <div className="space-y-2">
            {LOST_REASONS.map((r) => (
              <label
                key={r.value}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200
                  ${reason === r.value
                    ? 'border-red-300 bg-red-50 shadow-sm'
                    : 'border-[var(--warm-100)] hover:border-[var(--warm-200)] hover:bg-[var(--warm-50)]'
                  }
                `}
              >
                <input
                  type="radio"
                  name="lost_reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value as LostReason)}
                  className="w-4 h-4 text-red-500 border-[var(--warm-300)] focus:ring-red-300"
                />
                <span className="text-sm text-[var(--warm-700)]">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => reason && onConfirm(reason as LostReason)}
            disabled={!reason}
            loading={isLoading}
            className="flex-1"
          >
            Mark as Lost
          </Button>
        </div>
      </div>
    </ModalWrapper>
  )
}
