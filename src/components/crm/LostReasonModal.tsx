'use client'

import { useState } from 'react'
import { LOST_REASONS } from '@/lib/crm/stages'
import type { OpportunityWithLead, LostReason } from '@/lib/crm/types'
import { X, AlertTriangle } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
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
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium text-[var(--warm-600)] bg-[var(--warm-50)] hover:bg-[var(--warm-100)] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => reason && onConfirm(reason as LostReason)}
            disabled={!reason || isLoading}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? 'Saving...' : 'Mark as Lost'}
          </button>
        </div>
      </div>
    </div>
  )
}
