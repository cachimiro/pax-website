'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useInvoices } from '@/lib/crm/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, X, FileText, CreditCard, AlertCircle } from 'lucide-react'
import type { Invoice } from '@/lib/crm/types'

const invoiceSchema = z.object({
  amount: z.string().min(1, 'Amount required'),
  deposit_amount: z.string().optional(),
})

type InvoiceForm = z.infer<typeof invoiceSchema>

interface InvoiceManagerProps {
  opportunityId: string
}

export default function InvoiceManager({ opportunityId }: InvoiceManagerProps) {
  const supabase = createClient()
  const qc = useQueryClient()
  const { data: invoices = [], isLoading } = useInvoices(opportunityId)
  const [showCreate, setShowCreate] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
  })

  async function createInvoice(data: InvoiceForm) {
    const { error } = await supabase.from('invoices').insert({
      opportunity_id: opportunityId,
      amount: parseFloat(data.amount),
      deposit_amount: data.deposit_amount ? parseFloat(data.deposit_amount) : null,
      status: 'sent',
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Invoice created')
    qc.invalidateQueries({ queryKey: ['invoices'] })
    reset()
    setShowCreate(false)
  }

  async function recordPayment(invoiceId: string) {
    if (!paymentAmount) return

    const { error: payError } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount: parseFloat(paymentAmount),
      method: paymentMethod,
    })

    if (payError) {
      toast.error(payError.message)
      return
    }

    // Update invoice status to paid
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)

    // Check if this triggers deposit_paid stage
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

      toast.success('Deposit paid — stage updated')
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    } else {
      toast.success('Payment recorded')
    }

    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['payments'] })
    setRecordingPayment(null)
    setPaymentAmount('')
  }

  const statusColors: Record<string, string> = {
    sent: 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
    overdue: 'bg-red-50 text-red-600',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--warm-700)]">Invoices</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 text-xs text-[var(--green-600)] hover:text-[var(--green-700)] font-medium"
        >
          <Plus size={12} /> New Invoice
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleSubmit(createInvoice)} className="bg-[var(--warm-50)] rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--warm-500)] mb-1">Total Amount (£)</label>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-[var(--warm-500)] mb-1">Deposit Amount (£)</label>
              <input
                {...register('deposit_amount')}
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--green-700)] rounded-lg hover:bg-[var(--green-900)]">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Invoice list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-[var(--warm-50)] rounded-lg animate-pulse" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-6 text-xs text-[var(--warm-300)]">
          <FileText size={20} className="mx-auto mb-2 opacity-50" />
          No invoices
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-white border border-[var(--warm-100)] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--warm-800)]">
                    £{inv.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                  {inv.deposit_amount && (
                    <span className="text-xs text-[var(--warm-400)]">
                      (Deposit: £{inv.deposit_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[inv.status]}`}>
                    {inv.status}
                  </span>
                  <span className="text-[10px] text-[var(--warm-300)]">
                    {format(new Date(inv.created_at), 'dd MMM')}
                  </span>
                </div>
              </div>

              {/* Record payment */}
              {inv.status !== 'paid' && (
                <>
                  {recordingPayment === inv.id ? (
                    <div className="mt-3 pt-3 border-t border-[var(--warm-50)] flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] text-[var(--warm-400)] mb-1">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder={String(inv.deposit_amount ?? inv.amount)}
                          className="w-full px-2 py-1.5 text-xs border border-[var(--warm-200)] rounded focus:border-[var(--green-500)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--warm-400)] mb-1">Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-[var(--warm-200)] rounded focus:outline-none"
                        >
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cash">Cash</option>
                          <option value="stripe">Stripe</option>
                        </select>
                      </div>
                      <button
                        onClick={() => recordPayment(inv.id)}
                        className="px-2 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700"
                      >
                        Record
                      </button>
                      <button
                        onClick={() => setRecordingPayment(null)}
                        className="p-1.5 text-[var(--warm-400)] hover:text-[var(--warm-600)]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRecordingPayment(inv.id)
                        setPaymentAmount(String(inv.deposit_amount ?? inv.amount))
                      }}
                      className="mt-2 flex items-center gap-1 text-[10px] text-[var(--green-600)] hover:text-[var(--green-700)] font-medium"
                    >
                      <CreditCard size={10} /> Record payment
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
