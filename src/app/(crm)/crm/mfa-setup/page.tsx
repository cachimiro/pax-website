'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield, AlertCircle, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'

export default function MfaSetupPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function enroll() {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'PaxBespoke CRM',
      })

      if (enrollError) {
        setError(enrollError.message)
        return
      }

      if (data) {
        setFactorId(data.id)
        setSecret(data.totp.secret)

        // Generate QR code from the URI
        const qr = await QRCode.toDataURL(data.totp.uri, {
          width: 200,
          margin: 2,
          color: { dark: '#1A1917', light: '#FFFFFF' },
        })
        setQrCodeUrl(qr)
        setStep('verify')
      }
    }

    enroll()
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
        code: verifyCode,
      })

      if (verifyError) {
        setError('Invalid code. Please try again.')
        return
      }

      router.push('/crm/pipeline')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  function handleCopySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--warm-white)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--green-900)] rounded-2xl mb-4">
            <Shield className="text-white" size={24} />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">
            Set Up Two-Factor Authentication
          </h1>
          <p className="text-sm text-[var(--warm-500)] mt-1">
            Scan the QR code with your authenticator app
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

          {step === 'verify' && (
            <>
              {/* QR Code */}
              <div className="flex justify-center mb-6">
                {qrCodeUrl ? (
                  <div className="p-3 bg-white border border-[var(--warm-100)] rounded-xl">
                    <img src={qrCodeUrl} alt="QR Code for authenticator app" width={200} height={200} />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-[var(--warm-50)] rounded-xl animate-pulse" />
                )}
              </div>

              {/* Manual entry secret */}
              {secret && (
                <div className="mb-6">
                  <p className="text-xs text-[var(--warm-500)] mb-2 text-center">
                    Or enter this code manually:
                  </p>
                  <div className="flex items-center gap-2 bg-[var(--warm-50)] rounded-lg p-3">
                    <code className="flex-1 text-sm font-mono text-[var(--warm-700)] break-all text-center">
                      {secret}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="shrink-0 p-1.5 text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors"
                      title="Copy secret"
                    >
                      {copied ? <Check size={14} className="text-[var(--green-600)]" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Verify form */}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-[var(--warm-700)] mb-1.5">
                    Enter 6-digit code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    required
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
                  disabled={loading || verifyCode.length !== 6}
                  className="w-full py-2.5 bg-[var(--green-700)] hover:bg-[var(--green-900)] text-white text-sm font-medium
                    rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:ring-offset-2"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>
            </>
          )}

          {step === 'enroll' && !error && (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-[var(--green-600)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 space-y-2">
          <p className="text-xs text-[var(--warm-400)] text-center">
            Use Google Authenticator, Authy, or any TOTP-compatible app.
          </p>
          <p className="text-xs text-[var(--warm-400)] text-center">
            Two-factor authentication is required for all CRM users.
          </p>
        </div>
      </div>
    </div>
  )
}
