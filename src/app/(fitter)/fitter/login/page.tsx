'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react'

function FitterLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlParam = searchParams.get('error')
  const resetSuccess = searchParams.get('reset') === 'success'
  const linkExpired = urlParam === 'link_expired'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) {
        if (authError.message.toLowerCase().includes('invalid login')) {
          throw new Error("Incorrect email or password. If you haven't activated your account yet, use the link in your invitation email.")
        }
        throw authError
      }

      const role = data.user?.user_metadata?.role
      if (role !== 'fitter') {
        await supabase.auth.signOut()
        throw new Error('This login is for fitters only. CRM users should use /crm/login.')
      }

      router.push('/fitter')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/fitter/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send reset email')
      setResetSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
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
              <p className="text-green-100 text-sm">
                {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {resetSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                Password updated. You can now sign in with your new password.
              </div>
            )}
            {linkExpired && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                That link has expired or already been used. Request a new one below.
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[var(--warm-600)]">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--warm-600)]">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Sign In
                </button>
                <button type="button" onClick={() => { setMode('reset'); setError('') }}
                  className="w-full text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors">
                  Forgot password?
                </button>
              </form>
            )}

            {mode === 'reset' && !resetSent && (
              <form onSubmit={handleReset} className="space-y-4">
                <p className="text-sm text-[var(--warm-500)]">
                  Enter your email and we&apos;ll send a password reset link.
                </p>
                <div>
                  <label className="text-xs font-medium text-[var(--warm-600)]">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Send Reset Link
                </button>
                <button type="button" onClick={() => { setMode('login'); setError('') }}
                  className="w-full text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors">
                  Back to login
                </button>
              </form>
            )}

            {mode === 'reset' && resetSent && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className="text-sm font-medium text-[var(--warm-800)]">Check your email</p>
                <p className="text-xs text-[var(--warm-500)]">
                  If an account exists for {email}, a reset link has been sent.
                </p>
                <button onClick={() => { setMode('login'); setResetSent(false); setError('') }}
                  className="text-xs text-[var(--brand)] hover:underline">
                  Back to login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FitterLoginPage() {
  return (
    <Suspense>
      <FitterLoginForm />
    </Suspense>
  )
}
