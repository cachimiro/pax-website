'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, AlertCircle, ArrowLeft, CheckCircle2, Send, UserCheck
} from 'lucide-react'
import SignatureCanvas from '@/components/fitter/SignatureCanvas'
import type { FittingJob, SignerRelation } from '@/lib/fitter/types'

const SIGNER_RELATIONS: { value: SignerRelation; label: string }[] = [
  { value: 'owner', label: 'Property Owner' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'family_member', label: 'Family Member' },
  { value: 'other', label: 'Other' },
]

export default function FitterSignOffPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<FittingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'choose' | 'in_person' | 'remote' | 'forward' | 'success'>('choose')

  // In-person sign-off state
  const [fitterSig, setFitterSig] = useState('')
  const [customerSig, setCustomerSig] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerRelation, setSignerRelation] = useState<SignerRelation>('owner')
  const [submitting, setSubmitting] = useState(false)

  // Remote sign-off state
  const [remoteEmail, setRemoteEmail] = useState('')
  const [sendingRemote, setSendingRemote] = useState(false)

  // Forward state (under-18 / owner not present)
  const [forwardReason, setForwardReason] = useState<'under_18' | 'owner_absent'>('owner_absent')
  const [forwardEmail, setForwardEmail] = useState('')
  const [forwardNote, setForwardNote] = useState('')
  const [sendingForward, setSendingForward] = useState(false)

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/fitter/jobs/${id}`)
      if (!res.ok) throw new Error('Failed to load job')
      const data = await res.json()
      setJob(data.job)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  async function handleInPersonSignOff() {
    if (!fitterSig || !customerSig || !signerName.trim()) {
      setError('All fields are required: both signatures and signer name')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/fitter/jobs/${id}/sign-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'in_person',
          fitter_signature: fitterSig,
          customer_signature: customerSig,
          customer_signer_name: signerName.trim(),
          customer_signer_relation: signerRelation,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Sign-off failed')
      }
      setMode('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-off failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendRemote() {
    if (!remoteEmail.trim()) {
      setError('Email address is required')
      return
    }
    setSendingRemote(true)
    setError('')
    try {
      const res = await fetch(`/api/fitter/jobs/${id}/sign-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'remote_link',
          send_to: remoteEmail.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }
      setMode('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSendingRemote(false)
    }
  }

  async function handleForward() {
    if (!forwardEmail.trim()) {
      setError('Owner email is required')
      return
    }
    setSendingForward(true)
    setError('')
    try {
      const res = await fetch(`/api/fitter/jobs/${id}/sign-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'remote_link',
          send_to: forwardEmail.trim(),
          fitter_signature: fitterSig || undefined,
          forward_reason: forwardReason,
          forward_note: forwardNote || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }
      setMode('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to forward')
    } finally {
      setSendingForward(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  if (!job) return null

  if (mode === 'success') {
    return (
      <div className="text-center py-16 space-y-4">
        <CheckCircle2 size={48} className="mx-auto text-[var(--green-500)]" />
        <h2 className="text-lg font-bold text-[var(--warm-900)]">Sign-Off Complete</h2>
        <p className="text-sm text-[var(--warm-500)]">
          The fitting has been signed off successfully.
        </p>
        <button onClick={() => router.push('/fitter')}
          className="px-6 py-2 bg-[var(--green-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--green-700)] transition-colors">
          Back to Jobs
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => mode === 'choose' ? router.push(`/fitter/job/${id}`) : setMode('choose')}
          className="p-2 hover:bg-[var(--warm-100)] rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[var(--warm-900)]">Sign Off</h1>
          <p className="text-xs text-[var(--warm-500)]">{job.job_code} — {job.customer_name}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Choose mode */}
      {mode === 'choose' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--warm-600)]">How would you like to get the customer sign-off?</p>

          <button onClick={() => setMode('in_person')}
            className="w-full bg-white rounded-xl border border-[var(--warm-100)] p-4 text-left hover:border-[var(--green-300)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--green-50)] flex items-center justify-center">
                <UserCheck size={20} className="text-[var(--green-600)]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--warm-900)]">In Person</div>
                <div className="text-xs text-[var(--warm-500)]">Customer signs on this device now</div>
              </div>
            </div>
          </button>

          <button onClick={() => { setMode('remote'); setRemoteEmail('') }}
            className="w-full bg-white rounded-xl border border-[var(--warm-100)] p-4 text-left hover:border-[var(--green-300)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Send size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--warm-900)]">Send Remote Link</div>
                <div className="text-xs text-[var(--warm-500)]">Email a sign-off link to the customer</div>
              </div>
            </div>
          </button>

          <button onClick={() => setMode('forward')}
            className="w-full bg-white rounded-xl border border-amber-200 p-4 text-left hover:border-amber-400 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--warm-900)]">Owner Not Present / Under 18</div>
                <div className="text-xs text-[var(--warm-500)]">Forward sign-off to the property owner</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* In-person sign-off */}
      {mode === 'in_person' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--warm-900)]">Customer Details</h3>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Signer Name</label>
              <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
                placeholder="Full name of person signing"
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
            <SignatureCanvas label="Fitter Signature" onSignature={setFitterSig} />
          </div>

          <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
            <div className="bg-blue-50 rounded-lg p-3 mb-3 text-xs text-blue-700">
              Please hand the device to the customer to sign below.
            </div>
            <SignatureCanvas label="Customer Signature" onSignature={setCustomerSig} />
          </div>

          <button onClick={handleInPersonSignOff}
            disabled={submitting || !fitterSig || !customerSig || !signerName.trim()}
            className="w-full py-3 bg-[var(--green-600)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Complete Sign-Off
          </button>
        </div>
      )}

      {/* Forward to owner (under-18 / absent) */}
      {mode === 'forward' && (
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-amber-800">Forward Sign-Off to Owner</h3>
            <p className="text-xs text-amber-700">
              Use this when the person present cannot sign (under 18 or not the property owner).
              The owner will receive an email with a link to review and sign off.
            </p>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Reason</label>
              <select value={forwardReason} onChange={e => setForwardReason(e.target.value as 'under_18' | 'owner_absent')}
                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-amber-500 focus:outline-none">
                <option value="owner_absent">Property owner not present</option>
                <option value="under_18">Person present is under 18</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Owner Email</label>
              <input type="email" value={forwardEmail} onChange={e => setForwardEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Note (optional)</label>
              <textarea value={forwardNote} onChange={e => setForwardNote(e.target.value)} rows={2}
                placeholder="Any additional context for the owner..."
                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-amber-500 focus:outline-none resize-none" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
            <SignatureCanvas label="Fitter Signature" onSignature={setFitterSig} />
          </div>

          <button onClick={handleForward}
            disabled={sendingForward || !forwardEmail.trim()}
            className="w-full py-3 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {sendingForward ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Forward to Owner
          </button>
        </div>
      )}

      {/* Remote sign-off */}
      {mode === 'remote' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--warm-900)]">Send Sign-Off Link</h3>
            <p className="text-xs text-[var(--warm-500)]">
              The customer will receive an email with a link to review and sign off the fitting.
            </p>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Customer Email</label>
              <input type="email" value={remoteEmail} onChange={e => setRemoteEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
            </div>
          </div>

          {/* Fitter still signs */}
          <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
            <SignatureCanvas label="Fitter Signature (your sign-off)" onSignature={setFitterSig} />
          </div>

          <button onClick={handleSendRemote}
            disabled={sendingRemote || !remoteEmail.trim()}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {sendingRemote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send Sign-Off Link
          </button>
        </div>
      )}
    </div>
  )
}
