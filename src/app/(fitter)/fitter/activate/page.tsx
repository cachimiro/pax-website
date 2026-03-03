'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react'

function ActivateForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true); setError('')
    try {
      const res = await fetch('/api/fitter/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Activation failed')
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  if (!token) {
    return (
      <div className="text-center py-8">
        <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="text-[var(--warm-700)] font-medium">Invalid activation link</p>
        <p className="text-sm text-[var(--warm-400)] mt-1">Please use the link from your invitation email.</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
        <h2 className="text-xl font-semibold text-[var(--warm-800)]">Account Activated</h2>
        <p className="text-sm text-[var(--warm-500)]">Your account is ready. You can now log in.</p>
        <a href="/fitter/login"
          className="inline-block px-6 py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors">
          Go to Login
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-[var(--warm-500)]">
        Set a password to activate your PaxBespoke fitter account.
      </p>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-[var(--warm-600)]">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Minimum 8 characters" minLength={8}
          className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--warm-600)]">Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Activate Account
      </button>
    </form>
  )
}

export default function ActivatePage() {
  return (
    <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--green-700)] to-[var(--green-600)] px-6 py-5 text-white flex items-center gap-3">
            <Wrench size={24} />
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold">PaxBespoke Fitter Portal</h1>
              <p className="text-green-100 text-sm">Activate Your Account</p>
            </div>
          </div>
          <div className="p-6">
            <Suspense fallback={<div className="py-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>}>
              <ActivateForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
