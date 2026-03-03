'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2, AlertCircle, CheckCircle2, Camera, ChevronDown, ChevronRight
} from 'lucide-react'
import SignatureCanvas from '@/components/fitter/SignatureCanvas'
import type { SignerRelation } from '@/lib/fitter/types'

interface SignOffData {
  job_code: string
  customer_name: string | null
  customer_address: string | null
  scheduled_date: string | null
  photos_after: string[]
  checklist_after: { items: { key: string; label: string; checked: boolean }[] }
}

const SIGNER_RELATIONS: { value: SignerRelation; label: string }[] = [
  { value: 'owner', label: 'Property Owner' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'family_member', label: 'Family Member' },
  { value: 'other', label: 'Other' },
]

export default function PublicSignOffPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<SignOffData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [signerName, setSignerName] = useState('')
  const [signerRelation, setSignerRelation] = useState<SignerRelation>('owner')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sign-off/${token}`)
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Invalid or expired link')
        }
        const d = await res.json()
        setData(d)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function handleSubmit() {
    if (!signature || !signerName.trim()) {
      setError('Please provide your name and signature')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/sign-off/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_signature: signature,
          customer_signer_name: signerName.trim(),
          customer_signer_relation: signerRelation,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Sign-off failed')
      }
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-off failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <CheckCircle2 size={56} className="mx-auto text-[var(--green-500)]" />
          <h1 className="text-xl font-bold text-[var(--warm-900)]">Thank You!</h1>
          <p className="text-sm text-[var(--warm-600)]">
            Your fitting has been signed off successfully. We hope you love your new wardrobe!
          </p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center space-y-3">
            <AlertCircle size={40} className="mx-auto text-red-400" />
            <h1 className="text-lg font-bold text-[var(--warm-900)]">Link Invalid</h1>
            <p className="text-sm text-[var(--warm-500)]">{error}</p>
            <p className="text-xs text-[var(--warm-400)]">
              Please contact PaxBespoke if you need a new sign-off link.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-[var(--warm-50)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--green-700)] to-[var(--green-600)] text-white px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold">PaxBespoke</h1>
          <p className="text-green-100 text-sm mt-1">Fitting Sign-Off</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Job summary */}
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
          <div className="text-xs font-mono text-[var(--warm-400)]">{data.job_code}</div>
          <div className="text-sm font-medium text-[var(--warm-900)] mt-1">{data.customer_name}</div>
          {data.customer_address && (
            <div className="text-xs text-[var(--warm-500)] mt-1">{data.customer_address}</div>
          )}
        </div>

        {/* After photos (collapsible) */}
        {data.photos_after?.length > 0 && (
          <div className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
            <button onClick={() => setPhotosOpen(!photosOpen)}
              className="w-full p-4 flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-[var(--warm-500)]" />
                <span className="text-sm font-medium text-[var(--warm-900)]">
                  Completion Photos ({data.photos_after.length})
                </span>
              </div>
              {photosOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {photosOpen && (
              <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                {data.photos_after.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* After checklist (collapsible) */}
        {data.checklist_after?.items?.length > 0 && (
          <div className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
            <button onClick={() => setChecklistOpen(!checklistOpen)}
              className="w-full p-4 flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--warm-500)]" />
                <span className="text-sm font-medium text-[var(--warm-900)]">
                  Completion Checklist
                </span>
              </div>
              {checklistOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {checklistOpen && (
              <div className="px-4 pb-4 space-y-1">
                {data.checklist_after.items.map(item => (
                  <div key={item.key} className="flex items-center gap-2 text-sm py-1">
                    {item.checked ? (
                      <CheckCircle2 size={16} className="text-[var(--green-500)] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[var(--warm-200)] shrink-0" />
                    )}
                    <span className={item.checked ? 'text-[var(--warm-600)]' : 'text-[var(--warm-400)]'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Sign-off form */}
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--warm-900)]">Your Details</h3>
          <div>
            <label className="text-xs font-medium text-[var(--warm-600)]">Full Name</label>
            <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
              placeholder="Your full name"
              className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--warm-600)]">Relationship to Property</label>
            <select value={signerRelation} onChange={e => setSignerRelation(e.target.value as SignerRelation)}
              className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--green-500)] focus:outline-none">
              {SIGNER_RELATIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
          <SignatureCanvas label="Your Signature" onSignature={setSignature} />
        </div>

        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
          By signing, you confirm that the fitting work has been completed to your satisfaction.
        </div>

        <button onClick={handleSubmit}
          disabled={submitting || !signature || !signerName.trim()}
          className="w-full py-3 bg-[var(--green-600)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Confirm Sign-Off
        </button>
      </div>
    </div>
  )
}
