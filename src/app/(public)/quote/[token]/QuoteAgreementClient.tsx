'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'

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

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Props {
  token: string
  quote: {
    id: string
    amount: number
    deposit_amount: number
    items: LineItem[]
    status: string
    accepted_at: string | null
    accepted_name: string | null
  }
  lead: {
    name: string
    email: string | null
    postcode: string | null
    project_type: string | null
    style: string | null
    budget_band: string | null
    timeline: string | null
    space_constraints: string[]
  }
  opportunity: {
    package_complexity: string | null
  }
  meet1: {
    finish_type: string | null
    call_notes: string | null
    room_confirmed: string | null
  }
}

export default function QuoteAgreementClient({ token, quote, lead, opportunity, meet1 }: Props) {
  const [confirmName, setConfirmName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(quote.status === 'accepted')

  const alreadyAccepted = quote.status === 'accepted'
  const firstName = lead.name.split(' ')[0]
  const packageLabel = PACKAGE_LABELS[opportunity.package_complexity ?? ''] ?? 'Bespoke Wardrobe'
  const balance = quote.amount - quote.deposit_amount
  const constraints = lead.space_constraints
    .map((c) => CONSTRAINT_LABELS[c] ?? c)
    .filter(Boolean)

  async function handleAgree() {
    if (!confirmName.trim()) {
      setError('Please type your name to confirm.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/crm/quotes/agree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, confirm_name: confirmName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-warm-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            Quote agreed — thank you{alreadyAccepted ? '' : `, ${firstName}`}!
          </h1>
          <p className="text-warm-500 mb-6">
            {alreadyAccepted
              ? `This quote was agreed on ${new Date(quote.accepted_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
              : "We've received your agreement. Your deposit invoice will be with you shortly — check your inbox."}
          </p>
          <div className="bg-warm-50 rounded-2xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-warm-500">Total agreed</span>
              <span className="font-semibold text-warm-900">£{quote.amount.toLocaleString('en-GB')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-500">Deposit due now</span>
              <span className="font-semibold text-warm-900">£{quote.deposit_amount.toLocaleString('en-GB')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-500">Balance on completion</span>
              <span className="font-semibold text-warm-900">£{balance.toLocaleString('en-GB')}</span>
            </div>
          </div>
          <p className="text-xs text-warm-400 mt-4">
            Questions? Reply to the email we sent you or call us directly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-warm-100 rounded-full px-4 py-1.5 text-sm text-warm-500 mb-4">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Secure quote — PaxBespoke
          </div>
          <h1 className="text-3xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">
            Your quote is ready, {firstName}
          </h1>
          <p className="text-warm-500 mt-2">
            Please review everything below and agree to proceed. Once agreed, we&apos;ll send your deposit invoice.
          </p>
        </div>

        {/* Project summary */}
        <div className="bg-white rounded-3xl border border-warm-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-100 bg-warm-50">
            <h2 className="font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
              Project summary
            </h2>
          </div>
          <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Detail label="Name" value={lead.name} />
            <Detail label="Location" value={lead.postcode} />
            <Detail label="Room" value={meet1.room_confirmed ?? lead.project_type} />
            <Detail label="Package" value={packageLabel} />
            {lead.style && <Detail label="Style" value={lead.style} />}
            {meet1.finish_type && (
              <Detail label="Finish" value={meet1.finish_type} />
            )}
            {constraints.length > 0 && (
              <div className="col-span-2">
                <Detail label="Space notes" value={constraints.join(', ')} />
              </div>
            )}
            {meet1.call_notes && (
              <div className="col-span-2">
                <Detail label="Agreed on call" value={meet1.call_notes} />
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-3xl border border-warm-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-100 bg-warm-50">
            <h2 className="font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
              Pricing breakdown
            </h2>
          </div>
          <div className="px-6 py-2">
            {quote.items.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-100">
                    <th className="text-left py-3 text-warm-400 font-medium">Description</th>
                    <th className="text-right py-3 text-warm-400 font-medium w-16">Qty</th>
                    <th className="text-right py-3 text-warm-400 font-medium w-24">Unit</th>
                    <th className="text-right py-3 text-warm-400 font-medium w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, i) => (
                    <tr key={i} className="border-b border-warm-50 last:border-0">
                      <td className="py-3 text-warm-800">{item.description}</td>
                      <td className="py-3 text-right text-warm-600">{item.quantity}</td>
                      <td className="py-3 text-right text-warm-600">£{item.unit_price.toLocaleString('en-GB')}</td>
                      <td className="py-3 text-right font-medium text-warm-900">£{item.amount.toLocaleString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-4 text-sm text-warm-500">
                {packageLabel} — {lead.project_type ?? 'Wardrobe'}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 bg-warm-50 border-t border-warm-100 space-y-2 text-sm">
            <div className="flex justify-between text-warm-600">
              <span>Total</span>
              <span className="font-bold text-warm-900 text-base">£{quote.amount.toLocaleString('en-GB')}</span>
            </div>
            <div className="flex justify-between text-warm-600">
              <span>Deposit to secure your slot</span>
              <span className="font-semibold text-warm-900">£{quote.deposit_amount.toLocaleString('en-GB')}</span>
            </div>
            <div className="flex justify-between text-warm-400">
              <span>Balance — due on completion</span>
              <span>£{balance.toLocaleString('en-GB')}</span>
            </div>
          </div>
        </div>

        {/* Payment terms */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Payment terms</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>A deposit of £{quote.deposit_amount.toLocaleString('en-GB')} is due within 7 days to secure your fitting slot.</li>
            <li>The balance of £{balance.toLocaleString('en-GB')} is due on the day of completion.</li>
            <li>Cancellations within 48 hours of the fitting date may forfeit the deposit.</li>
          </ul>
        </div>

        {/* Agreement */}
        <div className="bg-white rounded-3xl border border-warm-100 shadow-sm px-6 py-6 space-y-4">
          <h2 className="font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
            Agree to proceed
          </h2>
          <p className="text-sm text-warm-500">
            By typing your name below and clicking &quot;I agree&quot;, you confirm that you have read and agree to the quote above and the payment terms.
          </p>

          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1.5">
              Type your full name to confirm
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => { setConfirmName(e.target.value); setError(null) }}
              placeholder={lead.name}
              className="w-full px-4 py-3 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleAgree}
            disabled={submitting || !confirmName.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#2d5c37] text-white font-semibold rounded-2xl hover:bg-[#244a2c] transition-all disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-heading)] shadow-lg shadow-green-900/10"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><CheckCircle className="w-4 h-4" /> I agree — proceed to deposit</>
            }
          </button>

          <p className="text-xs text-warm-400 text-center">
            Your agreement is recorded with a timestamp. Questions? Reply to the email we sent you.
          </p>
        </div>

      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-warm-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-warm-800 font-medium">{value}</dd>
    </div>
  )
}
