'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle, Wrench } from 'lucide-react'

export default function FitterLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) throw authError

      // Verify this is a fitter account
      const role = data.user?.user_metadata?.role
      if (role !== 'fitter') {
        await supabase.auth.signOut()
        throw new Error('This login is for fitters only. CRM users should use /crm/login.')
      }

      router.push('/fitter')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--green-700)] to-[var(--green-600)] px-6 py-5 text-white flex items-center gap-3">
            <Wrench size={24} />
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold">PaxBespoke Fitter Portal</h1>
              <p className="text-green-100 text-sm">Sign in to your account</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
