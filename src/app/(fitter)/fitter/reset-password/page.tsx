'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react'

export default function FitterResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()

  // Verify there's an active recovery session before showing the form
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Sign out so they log in fresh with the new password
      await supabase.auth.signOut()
      router.push('/fitter/login?reset=success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--green-700)] to-[var(--green-600)] px-6 py-5 text-white flex items-center gap-3">
            <Wrench size={24} />
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold">PaxBespoke Fitter Portal</h1>
              <p className="text-green-100 text-sm">Set a new password</p>
            </div>
          </div>

          <div className="p-6">
            {checking && (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[var(--brand)]" />
              </div>
            )}

            {!checking && !hasSession && (
              <div className="text-center py-6 space-y-3">
                <AlertTriangle size={36} className="text-amber-500 mx-auto" />
                <p className="text-sm font-medium text-[var(--warm-800)]">Link expired or already used</p>
                <p className="text-xs text-[var(--warm-500)]">
                  This password reset link is no longer valid. Request a new one from the login page.
                </p>
                <a
                  href="/fitter/login"
                  className="inline-block mt-2 px-5 py-2.5 bg-[var(--green-600)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors"
                >
                  Back to login
                </a>
              </div>
            )}

            {!checking && hasSession && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-[var(--warm-500)]">
                  Choose a new password for your fitter account.
                </p>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-[var(--warm-600)]">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                    className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--warm-600)]">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Set new password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
