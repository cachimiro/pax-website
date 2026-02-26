'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useCreateLead, useCreateOpportunity } from '@/lib/crm/hooks'
import { useRouter } from 'next/navigation'

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  postcode: z.string().optional(),
  project_type: z.string().optional(),
  budget_band: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  value_estimate: z.string().optional(),
})

type LeadForm = z.infer<typeof leadSchema>

const PROJECT_TYPES = [
  'Single Wardrobe',
  'Double Wardrobe',
  'Walk-in Wardrobe',
  'Multiple Wardrobes',
  'Full Room',
  'Other',
]

const BUDGET_BANDS = [
  'Under £1,000',
  '£1,000 – £2,000',
  '£2,000 – £3,500',
  '£3,500 – £5,000',
  '£5,000+',
]

const SOURCES = [
  'Website',
  'Google',
  'Instagram',
  'Facebook',
  'Referral',
  'Repeat Customer',
  'Other',
]

interface NewLeadModalProps {
  onClose: () => void
}

export default function NewLeadModal({ onClose }: NewLeadModalProps) {
  const router = useRouter()
  const createLead = useCreateLead()
  const createOpportunity = useCreateOpportunity()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      source: 'Website',
    },
  })

  async function onSubmit(data: LeadForm) {
    const { value_estimate, ...leadData } = data
    const numericValue = value_estimate ? parseFloat(value_estimate) : null

    // Create lead
    const lead = await createLead.mutateAsync({
      ...leadData,
      email: leadData.email || null,
      status: 'new',
    })

    // Auto-create opportunity
    await createOpportunity.mutateAsync({
      lead_id: lead.id,
      stage: 'new_enquiry',
      value_estimate: numericValue,
      owner_user_id: lead.owner_user_id,
    })

    onClose()
    router.push(`/crm/leads/${lead.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--warm-100)] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="font-heading text-lg font-semibold text-[var(--warm-900)]">New Lead</h2>
          <button onClick={onClose} className="p-1 text-[var(--warm-300)] hover:text-[var(--warm-500)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register('name')}
              placeholder="Full name"
              className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                placeholder:text-[var(--warm-300)]"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                  focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                  placeholder:text-[var(--warm-300)]"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Phone</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="07xxx xxxxxx"
                className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                  focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                  placeholder:text-[var(--warm-300)]"
              />
            </div>
          </div>

          {/* Postcode + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Postcode</label>
              <input
                {...register('postcode')}
                placeholder="WA1 1AA"
                className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                  focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                  placeholder:text-[var(--warm-300)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Source</label>
              <select
                {...register('source')}
                className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                  focus:border-[var(--green-500)] focus:outline-none text-[var(--warm-700)]"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Type + Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Project Type</label>
              <select
                {...register('project_type')}
                className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                  focus:border-[var(--green-500)] focus:outline-none text-[var(--warm-700)]"
              >
                <option value="">Select...</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Budget Band</label>
              <select
                {...register('budget_band')}
                className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                  focus:border-[var(--green-500)] focus:outline-none text-[var(--warm-700)]"
              >
                <option value="">Select...</option>
                {BUDGET_BANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Value estimate */}
          <div>
            <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Estimated Value (£)</label>
            <input
              {...register('value_estimate')}
              type="number"
              min={0}
              step={100}
              placeholder="0"
              className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                placeholder:text-[var(--warm-300)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--warm-700)] mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any additional details..."
              className="w-full px-3 py-2.5 text-sm border border-[var(--warm-200)] rounded-lg
                focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                placeholder:text-[var(--warm-300)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-[var(--warm-600)] bg-[var(--warm-50)] hover:bg-[var(--warm-100)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-[var(--green-700)] hover:bg-[var(--green-900)] rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
