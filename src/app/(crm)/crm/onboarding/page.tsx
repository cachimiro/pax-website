'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Calendar, CheckCircle2, ArrowRight, Loader2,
  Chrome, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const STEPS = [
  { id: 1, label: 'Your details', icon: User },
  { id: 2, label: 'Connect calendar', icon: Calendar },
  { id: 3, label: 'All set', icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Check if returning from Google OAuth callback
  useEffect(() => {
    const googleParam = searchParams.get('google')
    if (googleParam === 'connected') {
      setGoogleConnected(true)
      setStep(3)
    } else if (googleParam === 'error') {
      toast.error('Google Calendar connection failed — please try again')
    }
  }, [searchParams])

  // Pre-fill name from auth metadata
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name)
    })
  }, [supabase])

  const handleSaveDetails = async () => {
    if (!fullName.trim()) { toast.error('Please enter your name'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      }).eq('id', user.id)

      if (error) throw error
      setStep(2)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectGoogle = async () => {
    // Fetch the auth URL with state=onboarding so the callback stores tokens on the profile
    const res = await fetch('/api/crm/google/auth-url?state=onboarding')
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast.error('Could not generate Google auth URL')
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('profiles').update({
        onboarding_complete: true,
      }).eq('id', user.id)

      if (error) throw error
      router.push('/crm')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete onboarding')
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--green-900)] to-[#073D2E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="font-heading text-base font-bold text-orange-400">P</span>
          </div>
          <span className="font-heading text-lg font-semibold text-white">PaxBespoke</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const done = step > s.id
            const active = step === s.id
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  done ? 'bg-emerald-500 text-white' :
                  active ? 'bg-white text-[var(--green-900)]' :
                  'bg-white/10 text-white/40'
                }`}>
                  <s.icon size={12} />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px ${step > s.id ? 'bg-emerald-500' : 'bg-white/20'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h1 className="font-heading text-xl font-bold text-[var(--warm-900)] mb-1">
                  Welcome to PaxBespoke CRM
                </h1>
                <p className="text-sm text-[var(--warm-500)] mb-6">
                  Let&apos;s set up your account. This takes about 2 minutes.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--warm-600)] mb-1.5">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sarah Mitchell"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--warm-200)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--warm-600)] mb-1.5">
                      Phone <span className="text-[var(--warm-400)] font-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 07700 900000"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--warm-200)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveDetails}
                  disabled={saving}
                  className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--green-700)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--green-800)] disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Continue
                </button>
              </motion.div>
            )}

            {/* Step 2: Connect Google */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h1 className="font-heading text-xl font-bold text-[var(--warm-900)] mb-1">
                  Connect your Google Calendar
                </h1>
                <p className="text-sm text-[var(--warm-500)] mb-6">
                  This lets customers book directly into your calendar and shows your real availability on the booking form.
                </p>

                <div className="bg-[var(--warm-50)] rounded-xl p-4 mb-6 space-y-2">
                  {[
                    'Your availability shown on the booking form',
                    'Bookings added to your calendar automatically',
                    'Meet links generated for each call',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-[var(--warm-700)]">
                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConnectGoogle}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white border-2 border-[var(--warm-200)] text-[var(--warm-800)] text-sm font-semibold rounded-xl hover:border-[var(--green-500)] hover:bg-[var(--green-50)] transition-all"
                >
                  <Chrome size={18} className="text-blue-500" />
                  Connect with Google
                </button>

                <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Use the Google account you want customers to book into. You can reconnect a different account later from your profile settings.
                  </p>
                </div>

                <button
                  onClick={() => setStep(3)}
                  className="w-full mt-3 text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors py-1"
                >
                  Skip for now
                </button>
              </motion.div>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h1 className="font-heading text-xl font-bold text-[var(--warm-900)] mb-2">
                  You&apos;re all set!
                </h1>
                <p className="text-sm text-[var(--warm-500)] mb-6">
                  {googleConnected
                    ? 'Your Google Calendar is connected. Customers can now book directly into your calendar.'
                    : 'Your account is ready. You can connect Google Calendar later from your profile settings.'}
                </p>

                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--green-700)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--green-800)] disabled:opacity-50 transition-colors"
                >
                  {completing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Go to CRM
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          PaxBespoke CRM · Secure & private
        </p>
      </div>
    </div>
  )
}
