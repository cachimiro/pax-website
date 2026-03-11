'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInvoices } from '@/lib/crm/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  FileText, CreditCard, X, ChevronDown, ChevronUp,
  Copy, ExternalLink, RefreshCw, CheckCircle, Clock, AlertTriangle,
} from 'lucide-react'

interface InvoiceManagerProps {
  opportunityId: string
}

const STATUS_CONFIG = {
  sent:    { label: 'Unpaid',  classes: 'bg-amber-50 text-amber-700 border-amber-200',   Icon: Clock },
  paid:    { label: 'Paid',    classes: 'bg-green-50 text-green-700 border-green-200',   Icon: CheckCircle },
  overdue: { label: 'Overdue', classes: 'bg-red-50 text-red-600 border-red-200',         Icon: AlertTriangle },
}

const PAYMENT_METHODS = [
  { value: 'paypal',        label: 'PayPal' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card',          label: 'Card' },
  { value: 'cash',          label: 'Cash' },
  { value: 'quickbooks',    label: 'QuickBooks Payments' },
]

export default function InvoiceManager({ opportunityId }: InvoiceManagerProps) {
  const supabase = createClient()
  const qc = useQueryClient()
  const { data: invoices = [], isLoading } = useInvoices(opportunityId)

  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('paypal')
  const [resendingId, setResendingId] = useState<string | null>(null)

  async function recordPayment(invoiceId: string, amount: number, depositAmount: number | null) {
    const paid = parseFloat(paymentAmount) || depositAmount || amount
    if (!paid) return

    const { error } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount: paid,
      method: paymentMethod,
    })
    if (error) { toast.error(error.message); return }

    await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoiceId)

    const { data: opp } = await supabase
      .from('opportunities')
      .select('stage')
      .eq('id', opportunityId)
      .single()

    if (opp?.stage === 'awaiting_deposit') {
      await supabase
        .from('opportunities')
        .update({ stage: 'deposit_paid', deposit_paid_at: new Date().toISOString() })
        .eq('id', opportunityId)
      toast.success('Deposit paid — stage advanced')
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    } else {
      toast.success('Payment recorded')
    }

    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['payments'] })
    setRecordingId(null)
    setPaymentAmount('')
  }

  async function resendInvoice(invoiceId: string) {
    setResendingId(invoiceId)
    try {
      const res = await fetch('/api/crm/invoices/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId, opportunity_id: opportunityId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      toast.success('Invoice resent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resend')
    } finally {
      setResendingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => <div key={i} className="h-16 bg-warm-50 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-warm-300">
        <FileText size={20} className="mx-auto mb-2 opacity-40" />
        No invoices yet — created automatically when a customer agrees to a quote.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const cfg = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.sent
        const { Icon } = cfg
        const isExpanded  = expandedId === inv.id
        const isRecording = recordingId === inv.id
        const isResending = resendingId === inv.id

        // QBO-specific fields (added in migration 026)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extra = (inv as any) as Record<string, unknown>
        const lineItems   = extra.line_items as Array<{ description: string; quantity: number; unit_price: number; amount: number }> | null
        const qboId       = extra.qbo_invoice_id as string | null
        const qboNumber   = extra.qbo_invoice_number as string | null
        const qboPayUrl   = extra.qbo_pay_url as string | null
        const dueDate     = extra.due_date as string | null
        const sentAt      = extra.sent_at as string | null
        const paidAt      = extra.paid_at as string | null

        return (
          <div key={inv.id} className="bg-white border border-warm-100 rounded-xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-warm-900">
                    £{Number(inv.amount).toLocaleString('en-GB')}
                  </span>
                  {inv.deposit_amount && (
                    <span className="text-xs text-warm-400">
                      deposit £{Number(inv.deposit_amount).toLocaleString('en-GB')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {qboNumber && (
                    <span className="text-[10px] font-semibold text-warm-500">#{qboNumber}</span>
                  )}
                  <span className="text-[10px] text-warm-300">
                    {sentAt
                      ? `Sent ${format(new Date(sentAt), 'dd MMM yyyy')}`
                      : format(new Date(inv.created_at), 'dd MMM yyyy')}
                  </span>
                  {dueDate && inv.status !== 'paid' && (
                    <span className="text-[10px] text-warm-300">
                      · Due {format(new Date(dueDate), 'dd MMM')}
                    </span>
                  )}
                  {paidAt && (
                    <span className="text-[10px] text-green-600">
                      · Paid {format(new Date(paidAt), 'dd MMM')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.classes}`}>
                  <Icon size={9} />
                  {cfg.label}
                </span>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="p-1 text-warm-300 hover:text-warm-600 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Expanded */}
            {isExpanded && (
              <div className="border-t border-warm-50 px-4 py-3 space-y-4">

                {/* Line items */}
                {lineItems && lineItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-warm-400 uppercase tracking-wide mb-2">
                      Line items
                    </p>
                    <table className="w-full text-xs">
                      <tbody>
                        {lineItems.map((item, i) => (
                          <tr key={i} className="border-b border-warm-50 last:border-0">
                            <td className="py-1.5 text-warm-700 pr-3">{item.description}</td>
                            <td className="py-1.5 text-warm-400 text-right w-8">{item.quantity}</td>
                            <td className="py-1.5 text-warm-400 text-right w-20">
                              £{Number(item.unit_price).toLocaleString('en-GB')}
                            </td>
                            <td className="py-1.5 font-medium text-warm-800 text-right w-20">
                              £{Number(item.amount).toLocaleString('en-GB')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between pt-2 border-t border-warm-100 text-xs font-bold text-warm-800">
                      <span>Total</span>
                      <span>£{Number(inv.amount).toLocaleString('en-GB')}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {qboPayUrl && inv.status !== 'paid' && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(qboPayUrl); toast.success('Payment link copied') }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warm-200 text-xs font-medium text-warm-700 hover:bg-warm-50 transition-colors"
                    >
                      <Copy size={11} /> Copy payment link
                    </button>
                  )}
                  {qboId && (
                    <a
                      href={`https://app.qbo.intuit.com/app/invoice?txnId=${qboId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warm-200 text-xs font-medium text-warm-700 hover:bg-warm-50 transition-colors"
                    >
                      <ExternalLink size={11} /> View in QuickBooks
                    </a>
                  )}
                  {inv.status !== 'paid' && (
                    <button
                      onClick={() => resendInvoice(inv.id)}
                      disabled={isResending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warm-200 text-xs font-medium text-warm-700 hover:bg-warm-50 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={isResending ? 'animate-spin' : ''} />
                      Resend invoice
                    </button>
                  )}
                </div>

                {/* Record payment */}
                {inv.status !== 'paid' && (
                  isRecording ? (
                    <div className="bg-warm-50 rounded-xl p-3 space-y-3">
                      <p className="text-xs font-semibold text-warm-700">Record payment received</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-warm-400 mb-1">Amount (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={String(inv.deposit_amount ?? inv.amount)}
                            className="w-full px-2.5 py-1.5 text-xs border border-warm-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-warm-400 mb-1">Method</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-warm-200 rounded-lg focus:outline-none"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => recordPayment(inv.id, inv.amount, inv.deposit_amount)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-green-700 rounded-lg hover:bg-green-800"
                        >
                          Record
                        </button>
                        <button onClick={() => setRecordingId(null)} className="p-1.5 text-warm-400 hover:text-warm-600">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setRecordingId(inv.id); setPaymentAmount(String(inv.deposit_amount ?? inv.amount)) }}
                      className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 font-medium"
                    >
                      <CreditCard size={11} /> Record payment received
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
