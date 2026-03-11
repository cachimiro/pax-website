'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Loader2, X, GitMerge } from 'lucide-react'
import type { Lead } from '@/lib/crm/types'

interface Props {
  leadA: Lead
  leadB: Lead
  onClose: () => void
}

export default function MergeLeadsModal({ leadA, leadB, onClose }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const [primaryId, setPrimaryId] = useState<string>(leadA.id)
  const [loading, setLoading] = useState(false)

  const primary = primaryId === leadA.id ? leadA : leadB
  const secondary = primaryId === leadA.id ? leadB : leadA

  async function handleMerge() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/leads/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId: primary.id, secondaryId: secondary.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Merge failed')
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Leads merged successfully')
      onClose()
      router.push(`/crm/leads/${primary.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setLoading(false)
    }
  }

  function LeadCard({ lead, role }: { lead: Lead; role: 'primary' | 'secondary' }) {
    const isPrimary = role === 'primary'
    return (
      <div className={`flex-1 rounded-xl border p-4 space-y-2 ${isPrimary ? 'border-[var(--green-300)] bg-[var(--green-50)]' : 'border-[var(--warm-200)] bg-[var(--warm-50)]'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isPrimary ? 'text-[var(--green-700)]' : 'text-[var(--warm-500)]'}`}>
            {isPrimary ? 'Keep (Primary)' : 'Absorb (Secondary)'}
          </span>
          {!isPrimary && (
            <button
              onClick={() => setPrimaryId(secondary.id)}
              className="text-[10px] text-[var(--green-700)] hover:underline font-medium"
            >
              Make primary
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-sm font-bold text-[var(--green-700)] shrink-0">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--warm-900)]">{lead.name}</p>
            <p className="text-xs text-[var(--warm-500)]">{lead.email ?? lead.phone ?? '—'}</p>
          </div>
        </div>
        <div className="space-y-1 text-xs text-[var(--warm-600)]">
          {lead.phone && <p>📞 {lead.phone}</p>}
          {lead.postcode && <p>📍 {lead.postcode}</p>}
          {lead.project_type && <p>🏠 {lead.project_type}</p>}
          <p className="text-[var(--warm-400)]">Status: <span className="capitalize">{lead.status}</span></p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--warm-100)]">
          <div className="flex items-center gap-2">
            <GitMerge size={16} className="text-[var(--green-600)]" />
            <h2 className="text-sm font-semibold text-[var(--warm-900)]">Merge Leads</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--warm-400)] hover:text-[var(--warm-600)] rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Side-by-side cards */}
          <div className="flex items-stretch gap-3">
            <LeadCard lead={primary} role="primary" />
            <div className="flex items-center shrink-0">
              <ArrowRight size={16} className="text-[var(--warm-300)]" />
            </div>
            <LeadCard lead={secondary} role="secondary" />
          </div>

          {/* What happens */}
          <div className="rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)] p-4 text-xs text-[var(--warm-600)] space-y-1.5">
            <p className="font-semibold text-[var(--warm-700)] mb-2">What will happen:</p>
            <p>✅ <strong>{primary.name}</strong>&apos;s contact details are kept.</p>
            <p>🔀 All opportunities, tasks, bookings, messages, and invoices from <strong>{secondary.name}</strong> will be moved to <strong>{primary.name}</strong>.</p>
            <p>🗑️ <strong>{secondary.name}</strong> will be moved to trash.</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--warm-600)] hover:text-[var(--warm-800)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--green-600)] text-white rounded-xl hover:bg-[var(--green-700)] disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
              Confirm Merge
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
