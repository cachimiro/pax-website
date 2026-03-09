'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Send, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import type { Lead, Opportunity, Meet1Notes } from '@/lib/crm/types'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface QuoteBuilderProps {
  opportunityId: string
  lead: Lead
  opportunity: Opportunity
  meet1Notes?: Meet1Notes | null
  existingQuote?: {
    id: string
    amount: number
    deposit_amount: number | null
    items: LineItem[]
    status: string
    sent_at: string | null
    accepted_at?: string | null
  } | null
  onQuoteSent?: () => void
}

const PACKAGE_LABELS: Record<string, string> = {
  budget: 'Budget Package',
  paxbespoke: 'PaxBespoke Package',
  select: 'Select Package',
  unsure: 'Package TBC',
}

const CONSTRAINT_LABELS: Record<string, string> = {
  'sloped-ceiling': 'Sloped ceiling',
  'tall-ceiling': 'Tall ceiling',
  'chimney-breast': 'Chimney breast',
  'bulkhead': 'Bulkhead',
  'alcoves': 'Alcoves',
  'limited-door-space': 'Limited door space',
}

function buildDefaultLineItems(lead: Lead, opportunity: Opportunity): LineItem[] {
  const pkg = PACKAGE_LABELS[opportunity.package_complexity ?? ''] ?? 'Bespoke Wardrobe'
  const room = lead.project_type ?? 'Wardrobe'
  const estimate = opportunity.value_estimate ?? 0
  const deposit = Math.round(estimate * 0.3)
  const balance = estimate - deposit

  const items: LineItem[] = [
    {
      description: `${pkg} — ${room}`,
      quantity: 1,
      unit_price: estimate,
      amount: estimate,
    },
  ]

  if (deposit > 0) {
    // Split into deposit + balance for clarity
    items.length = 0
    items.push({
      description: `${pkg} — ${room} (30% deposit)`,
      quantity: 1,
      unit_price: deposit,
      amount: deposit,
    })
    items.push({
      description: `${pkg} — ${room} (balance on completion)`,
      quantity: 1,
      unit_price: balance,
      amount: balance,
    })
  }

  return items
}

export default function QuoteBuilder({
  opportunityId,
  lead,
  opportunity,
  meet1Notes,
  existingQuote,
  onQuoteSent,
}: QuoteBuilderProps) {
  const [items, setItems] = useState<LineItem[]>(
    (existingQuote?.items as LineItem[])?.length
      ? (existingQuote.items as LineItem[])
      : buildDefaultLineItems(lead, opportunity)
  )
  const [depositPct, setDepositPct] = useState(30)
  const [notes, setNotes] = useState('')
  const [showSummary, setShowSummary] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [quoteId, setQuoteId] = useState<string | null>(existingQuote?.id ?? null)
  const [quoteStatus, setQuoteStatus] = useState(existingQuote?.status ?? 'draft')
  const [sentAt, setSentAt] = useState<string | null>(existingQuote?.sent_at ?? null)
  const [acceptedAt, setAcceptedAt] = useState<string | null>(existingQuote?.accepted_at ?? null)
  const [error, setError] = useState<string | null>(null)

  const total = items.reduce((sum, i) => sum + i.amount, 0)
  const depositAmount = Math.round(total * (depositPct / 100))

  const isAccepted = quoteStatus === 'accepted'
  const isSent = quoteStatus === 'sent' || isAccepted

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const next = [...prev]
      const item = { ...next[index], [field]: value }
      // Auto-calc amount from qty × unit_price
      if (field === 'quantity' || field === 'unit_price') {
        item.amount = Number(item.quantity) * Number(item.unit_price)
      }
      next[index] = item
      return next
    })
    setSaved(false)
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, amount: 0 }])
    setSaved(false)
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  async function saveQuote() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/crm/quotes', {
        method: quoteId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          quote_id: quoteId,
          items,
          amount: total,
          deposit_amount: depositAmount,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save quote')
      setQuoteId(data.id)
      setQuoteStatus(data.status)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function sendQuote() {
    if (!quoteId) await saveQuote()
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/crm/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId ?? undefined, opportunity_id: opportunityId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send quote')
      setQuoteStatus('sent')
      setSentAt(new Date().toISOString())
      onQuoteSent?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  // ── Project summary (pre-filled from lead + meet1) ──────────────────────────
  const pkg = PACKAGE_LABELS[opportunity.package_complexity ?? ''] ?? null
  const constraints = (lead.space_constraints ?? [])
    .map((c: string) => CONSTRAINT_LABELS[c] ?? c)
    .join(', ')
  const doorFinish = meet1Notes?.finish_type ?? (lead as Record<string, unknown>).door_finish_type as string | null

  return (
    <div className="space-y-5">

      {/* Status banner */}
      {isAccepted && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span>
            Customer agreed to this quote on{' '}
            {acceptedAt ? new Date(acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}.
            Deposit invoice has been created.
          </span>
        </div>
      )}

      {isSent && !isAccepted && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <Send className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            Quote sent to {lead.email} on{' '}
            {sentAt ? new Date(sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '—'}.
            Awaiting customer agreement.
          </span>
        </div>
      )}

      {/* Project summary (collapsible) */}
      <div className="border border-warm-100 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSummary((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-warm-50 text-sm font-semibold text-warm-800 hover:bg-warm-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-warm-500" />
            Project summary (pre-filled from booking &amp; call)
          </span>
          {showSummary ? <ChevronUp className="w-4 h-4 text-warm-400" /> : <ChevronDown className="w-4 h-4 text-warm-400" />}
        </button>

        {showSummary && (
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <SummaryRow label="Customer" value={lead.name} />
            <SummaryRow label="Email" value={lead.email} />
            <SummaryRow label="Phone" value={lead.phone} />
            <SummaryRow label="Location" value={lead.postcode} />
            <SummaryRow label="Room" value={lead.project_type} />
            <SummaryRow label="Package" value={pkg} />
            <SummaryRow label="Style" value={lead.style} />
            <SummaryRow label="Budget band" value={lead.budget_band} />
            <SummaryRow label="Timeline" value={lead.timeline} />
            {constraints && <SummaryRow label="Space notes" value={constraints} />}
            {doorFinish && <SummaryRow label="Door finish" value={doorFinish} />}
            {meet1Notes?.call_notes && (
              <div className="col-span-2">
                <SummaryRow label="Call notes" value={meet1Notes.call_notes} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <h4 className="text-sm font-semibold text-warm-800 mb-2">Line items</h4>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_90px_90px_32px] gap-2 items-center">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                placeholder="Description"
                disabled={isAccepted}
                className="px-3 py-2 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-warm-50 disabled:text-warm-400"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                min={1}
                disabled={isAccepted}
                className="px-2 py-2 rounded-lg border border-warm-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-warm-50"
              />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400 text-sm">£</span>
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                  min={0}
                  disabled={isAccepted}
                  className="w-full pl-6 pr-2 py-2 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-warm-50"
                />
              </div>
              <div className="px-3 py-2 rounded-lg bg-warm-50 text-sm text-warm-700 text-right font-medium">
                £{item.amount.toLocaleString()}
              </div>
              {!isAccepted && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="p-1 text-warm-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {!isAccepted && (
          <button
            type="button"
            onClick={addItem}
            className="mt-2 flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add line item
          </button>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-warm-100 pt-4 space-y-2">
        <div className="flex justify-between text-sm text-warm-600">
          <span>Total</span>
          <span className="font-semibold text-warm-900">£{total.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-warm-600">
          <div className="flex items-center gap-2">
            <span>Deposit</span>
            {!isAccepted && (
              <select
                value={depositPct}
                onChange={(e) => setDepositPct(Number(e.target.value))}
                className="text-xs border border-warm-200 rounded px-1 py-0.5 focus:outline-none"
              >
                {[20, 25, 30, 33, 50].map((p) => (
                  <option key={p} value={p}>{p}%</option>
                ))}
              </select>
            )}
          </div>
          <span className="font-semibold text-warm-900">£{depositAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-warm-400">
          <span>Balance on completion</span>
          <span>£{(total - depositAmount).toLocaleString()}</span>
        </div>
      </div>

      {/* Notes */}
      {!isAccepted && (
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">
            Internal notes <span className="text-warm-400 font-normal">(not shown to customer)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any notes for the team..."
            className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Actions */}
      {!isAccepted && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveQuote}
            disabled={saving || sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saved ? 'Saved' : 'Save draft'}
          </button>

          <button
            type="button"
            onClick={sendQuote}
            disabled={saving || sending || total === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E8872B] text-white text-sm font-semibold hover:bg-[#d47a24] transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSent ? 'Resend quote' : 'Send quote to customer'}
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-warm-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-warm-800 font-medium mt-0.5">{value}</dd>
    </div>
  )
}
