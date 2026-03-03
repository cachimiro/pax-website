'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, Clock, Video, MapPin, Wrench, Phone, AlertTriangle, RefreshCw, Loader2, ArrowLeft, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react'
import type { PortalBooking, PortalStep } from './components/types'
import SlotPicker from './components/SlotPicker'

const TYPE_ICONS: Record<string, typeof Phone> = {
  call1: Phone, call2: Video, onboarding: Calendar, visit: MapPin, fitting: Wrench,
}
const CANCEL_REASONS = [
  'I no longer need this service',
  'I found another provider',
  'The timing doesn\'t work for me',
  'I need to think about it more',
  'Other',
]

export default function PortalClient() {
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token')

  const [step, setStep] = useState<PortalStep>(tokenParam ? 'bookings' : 'lookup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Lookup state
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Verification state
  const [verificationId, setVerificationId] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  // Session state
  const [sessionToken, setSessionToken] = useState('')
  const [authToken, setAuthToken] = useState(tokenParam ?? '')

  // Bookings state
  const [bookings, setBookings] = useState<PortalBooking[]>([])
  const [leadName, setLeadName] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<PortalBooking | null>(null)

  // Action state
  const [rescheduleDateTime, setRescheduleDateTime] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // Auto-load bookings if token present
  useEffect(() => {
    if (tokenParam) loadBookings(tokenParam)
  }, [tokenParam])

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (sessionToken) return { Authorization: `Bearer ${sessionToken}` }
    return {}
  }, [sessionToken])

  const getAuthParam = useCallback((): string => {
    if (authToken) return `?token=${authToken}`
    return ''
  }, [authToken])

  // ── API calls ──────────────────────────────────────────────────

  async function handleLookup() {
    if (!email.trim() || !phone.trim()) { setError('Please enter both email and phone number'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/portal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setVerificationId(data.verification_id)
      setStep('code')
      setResendTimer(60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  async function handleVerifyCode() {
    if (!code.trim() || code.trim().length !== 6) { setCodeError('Please enter the 6-digit code'); return }
    setLoading(true); setCodeError('')
    try {
      const res = await fetch('/api/portal/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_id: verificationId, code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.locked) { setStep('locked'); return }
        setCodeError(data.error || 'Invalid code')
        return
      }
      setSessionToken(data.session_token)
      await loadBookings(undefined, data.session_token)
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  async function loadBookings(token?: string, session?: string) {
    setLoading(true); setError('')
    try {
      const url = token
        ? `/api/portal/bookings?token=${token}`
        : '/api/portal/bookings'
      const headers: Record<string, string> = {}
      if (session) headers.Authorization = `Bearer ${session}`
      else if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`

      const res = await fetch(url, { headers })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { setStep('expired'); return }
        throw new Error(data.error || 'Failed to load bookings')
      }
      setBookings(data.bookings ?? [])
      setLeadName(data.lead?.name ?? '')
      setStep(data.bookings?.length ? 'bookings' : 'no-bookings')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
      setStep('expired')
    } finally { setLoading(false) }
  }

  async function handleReschedule() {
    if (!rescheduleDateTime || !selectedBooking) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/portal/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          action: 'reschedule',
          scheduled_at: rescheduleDateTime,
          token: authToken || undefined,
          session_token: sessionToken || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule')
      setSuccessMessage(data.message || 'Your booking has been rescheduled')
      setStep('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule')
    } finally { setLoading(false) }
  }

  async function handleCancel() {
    if (!selectedBooking) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/portal/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          action: 'cancel',
          reason: cancelReason || undefined,
          token: authToken || undefined,
          session_token: sessionToken || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      setSuccessMessage(data.message || 'Your booking has been cancelled')
      setStep('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally { setLoading(false) }
  }

  async function handleNotMyBooking(booking: PortalBooking) {
    setLoading(true)
    try {
      await fetch('/api/portal/not-my-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          token: authToken || undefined,
          session_token: sessionToken || undefined,
        }),
      })
      setSuccessMessage("Thank you for reporting this. We'll investigate and get back to you.")
      setStep('success')
    } catch {
      setError('Something went wrong')
    } finally { setLoading(false) }
  }

  async function handleResendCode() {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/portal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setVerificationId(data.verification_id)
        setResendTimer(60)
        setCode('')
        setCodeError('')
      }
    } catch {} finally { setLoading(false) }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--green-700)] to-[var(--green-600)] px-4 sm:px-6 py-4 sm:py-5 text-white">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold">
          {step === 'lookup' || step === 'code' ? 'Manage My Booking' :
           step === 'reschedule' ? 'Reschedule Booking' :
           step === 'cancel' ? 'Cancel Booking' :
           step === 'success' ? 'All Done' :
           'My Bookings'}
        </h1>
        {leadName && step === 'bookings' && (
          <p className="text-green-100 text-sm mt-0.5">Welcome back, {leadName.split(' ')[0]}</p>
        )}
      </div>

      <div className="p-4 sm:p-6">
        {error && step !== 'success' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* LOOKUP STEP */}
        {step === 'lookup' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--warm-500)]">
              Enter the email and phone number you used when booking to find your appointments.
            </p>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Phone number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="07xxx xxxxxx"
                className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
            </div>
            <button onClick={handleLookup} disabled={loading}
              className="w-full py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Find My Booking
            </button>
          </div>
        )}

        {/* CODE STEP */}
        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--warm-500)]">
              We&apos;ve sent a 6-digit code to <strong className="text-[var(--warm-700)]">{email}</strong>. Enter it below.
            </p>
            <div>
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} autoFocus
                className={`w-full px-4 py-3 text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.5em] border rounded-xl focus:outline-none ${
                  codeError ? 'border-red-300 focus:border-red-500' : 'border-[var(--warm-100)] focus:border-[var(--green-500)]'
                }`} />
              {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
            </div>
            <button onClick={handleVerifyCode} disabled={loading || code.length !== 6}
              className="w-full py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Verify Code
            </button>
            <div className="flex items-center justify-between text-xs">
              <button onClick={() => { setStep('lookup'); setCode(''); setCodeError('') }}
                className="text-[var(--warm-400)] hover:text-[var(--warm-600)] flex items-center gap-1">
                <ArrowLeft size={12} /> Back
              </button>
              <button onClick={handleResendCode} disabled={resendTimer > 0 || loading}
                className="text-[var(--green-600)] hover:text-[var(--green-700)] disabled:text-[var(--warm-300)]">
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {/* BOOKINGS LIST */}
        {step === 'bookings' && !loading && (
          <div className="space-y-3">
            {bookings.map(b => {
              const Icon = TYPE_ICONS[b.type] ?? Calendar
              const dt = new Date(b.scheduled_at)
              return (
                <div key={b.id} className="border border-[var(--warm-100)] rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--green-50)] flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-[var(--green-600)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--warm-800)]">{b.label}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-[var(--warm-500)]">
                        <Calendar size={13} />
                        <span>{dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-[var(--warm-500)]">
                        <Clock size={13} />
                        <span>{dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — {b.duration_min} min</span>
                      </div>
                      {b.meet_link && (
                        <a href={b.meet_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-blue-600 hover:text-blue-700">
                          <Video size={12} /> Join video call
                        </a>
                      )}
                      {b.address && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--warm-400)]">
                          <MapPin size={12} /> {b.address}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Warnings */}
                  {b.reschedule_count >= 2 && (
                    <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-xs text-orange-600">
                      <RefreshCw size={12} /> Rescheduled {b.reschedule_count} times
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedBooking(b); setRescheduleDateTime(''); setError(''); setStep('reschedule') }}
                      disabled={b.reschedule_count >= 3}
                      className="flex-1 py-2.5 text-sm font-medium bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <RefreshCw size={14} /> Reschedule
                    </button>
                    <button onClick={() => { setSelectedBooking(b); setCancelReason(''); setError(''); setStep('cancel') }}
                      className="flex-1 py-2.5 text-sm font-medium bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <XCircle size={14} /> Cancel
                    </button>
                  </div>
                  <button onClick={() => handleNotMyBooking(b)}
                    className="w-full py-1.5 text-[11px] text-[var(--warm-400)] hover:text-red-500 transition-colors flex items-center justify-center gap-1">
                    <ShieldAlert size={11} /> This isn&apos;t my booking
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* LOADING */}
        {loading && (step === 'bookings') && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--green-600)]" />
            <span className="ml-2 text-sm text-[var(--warm-500)]">Loading your bookings...</span>
          </div>
        )}

        {/* RESCHEDULE STEP */}
        {step === 'reschedule' && selectedBooking && (
          <div className="space-y-4">
            <button onClick={() => setStep('bookings')} className="text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] flex items-center gap-1">
              <ArrowLeft size={12} /> Back to bookings
            </button>
            <div className="p-3 bg-[var(--warm-50)] rounded-xl text-sm">
              <p className="font-medium text-[var(--warm-700)]">{selectedBooking.label}</p>
              <p className="text-[var(--warm-500)] text-xs mt-0.5">
                Currently: {new Date(selectedBooking.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(selectedBooking.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {selectedBooking.reschedule_count >= 2 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>This booking has been rescheduled {selectedBooking.reschedule_count} times. {selectedBooking.reschedule_count >= 3 ? 'Please contact us directly.' : 'One more reschedule is available.'}</span>
              </div>
            )}
            <p className="text-sm text-[var(--warm-500)]">Choose a new date and time:</p>
            <SlotPicker onSelect={setRescheduleDateTime} selected={rescheduleDateTime} />
            {rescheduleDateTime && (
              <button onClick={handleReschedule} disabled={loading}
                className="w-full py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm Reschedule
              </button>
            )}
          </div>
        )}

        {/* CANCEL STEP */}
        {step === 'cancel' && selectedBooking && (
          <div className="space-y-4">
            <button onClick={() => setStep('bookings')} className="text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] flex items-center gap-1">
              <ArrowLeft size={12} /> Back to bookings
            </button>
            <div className="p-3 bg-[var(--warm-50)] rounded-xl text-sm">
              <p className="font-medium text-[var(--warm-700)]">{selectedBooking.label}</p>
              <p className="text-[var(--warm-500)] text-xs mt-0.5">
                {new Date(selectedBooking.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(selectedBooking.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {selectedBooking.deposit_paid && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>A deposit has been paid for this project. Please contact us directly to discuss cancellation.</span>
              </div>
            )}
            {!selectedBooking.deposit_paid && (
              <>
                <div>
                  <label className="text-xs font-medium text-[var(--warm-600)]">Reason for cancellation</label>
                  <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                    className="w-full mt-1 px-4 py-3 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                    <option value="">Select a reason (optional)...</option>
                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  This action cannot be undone. You can always book a new consultation at paxbespoke.uk/book.
                </div>
                <button onClick={handleCancel} disabled={loading}
                  className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Confirm Cancellation
                </button>
              </>
            )}
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <p className="text-[var(--warm-700)] font-medium">{successMessage}</p>
            <p className="text-sm text-[var(--warm-400)]">A confirmation email has been sent to you.</p>
            <a href="/book" className="inline-block px-6 py-3 bg-[var(--orange-500)] text-white font-semibold rounded-xl hover:bg-[var(--orange-600)] transition-colors text-sm">
              Book a New Consultation
            </a>
          </div>
        )}

        {/* NO BOOKINGS */}
        {step === 'no-bookings' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-[var(--warm-50)] rounded-full flex items-center justify-center mx-auto">
              <Calendar size={32} className="text-[var(--warm-300)]" />
            </div>
            <p className="text-[var(--warm-700)] font-medium">No active bookings found</p>
            <p className="text-sm text-[var(--warm-400)]">You don&apos;t have any upcoming appointments.</p>
            <a href="/book" className="inline-block px-6 py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors text-sm">
              Book a Consultation
            </a>
          </div>
        )}

        {/* LOCKED OUT */}
        {step === 'locked' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert size={32} className="text-red-500" />
            </div>
            <p className="text-[var(--warm-700)] font-medium">Too many attempts</p>
            <p className="text-sm text-[var(--warm-400)]">Please wait a few minutes and try again, or contact us directly.</p>
            <button onClick={() => { setStep('lookup'); setCode(''); setCodeError('') }}
              className="inline-block px-6 py-3 bg-[var(--warm-100)] text-[var(--warm-600)] font-semibold rounded-xl hover:bg-[var(--warm-200)] transition-colors text-sm">
              Try Again
            </button>
          </div>
        )}

        {/* EXPIRED TOKEN */}
        {step === 'expired' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⏰</span>
            </div>
            <p className="text-[var(--warm-700)] font-medium">Link expired</p>
            <p className="text-sm text-[var(--warm-400)]">This link is no longer valid. You can look up your booking using your email and phone number.</p>
            <button onClick={() => { setStep('lookup'); setError('') }}
              className="inline-block px-6 py-3 bg-[var(--green-600)] text-white font-semibold rounded-xl hover:bg-[var(--green-700)] transition-colors text-sm">
              Look Up My Booking
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
