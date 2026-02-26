'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, AlertCircle } from 'lucide-react'

export default function MfaVerifyPage() {
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getFactors() {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp ?? []
      if (totp.length > 0) {
        setFactorId(totp[0].id)
      } else {
        // No TOTP factor — redirect to setup
        router.push('/crm/mfa-setup')
      }
    }
    getFactors()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return

    setError(null)
    setLoading(true)

    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError) {
        setError(challengeError.message)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })

      if (verifyError) {
        setError('Invalid code. Please try again.')
        setCode('')
        return
      }

      router.push('/crm/pipeline')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--warm-white)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--green-900)] rounded-2xl mb-4">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">
            Two-Factor Verification
          </h1>
          <p className="text-sm text-[var(--warm-500)] mt-1">
            Enter the code from your authenticator app
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--warm-100)] p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 mb-6">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-[var(--warm-700)] mb-1.5">
                Authentication code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 border border-[var(--warm-200)] rounded-lg
                  focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                  placeholder:text-[var(--warm-200)] text-[var(--warm-800)]
                  transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-[var(--green-700)] hover:bg-[var(--green-900)] text-white text-sm font-medium
                rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify'
              )}
            </button>
          </form>

          {/* Sign out link */}
          <div className="mt-4 text-center">
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/crm/login')
              }}
              className="text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors"
            >
              Sign in with a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
