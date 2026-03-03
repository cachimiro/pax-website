'use client'

import { useState, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Phone, Video, Home, Wrench, Calendar, Clock, MapPin,
  ExternalLink, Copy, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, Sparkles, User, RefreshCw, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CalendarEvent } from './CalendarTypes'

interface CalendarEventPanelProps {
  event: CalendarEvent | null
  onClose: () => void
  onActionComplete: () => void // refresh data after any action
}

const typeIcons: Record<string, typeof Phone> = {
  call1: Phone,
  call2: Video,
  onboarding: Home,
  visit: MapPin,
  fitting: Wrench,
  task: CheckCircle2,
}

const typeLabels: Record<string, string> = {
  call1: 'Discovery Call',
  call2: 'Design Review',
  onboarding: 'Onboarding Session',
  visit: 'Site Visit',
  fitting: 'Fitting',
  task: 'Task',
}

const outcomeStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
  completed:  { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
  no_show:    { bg: 'bg-red-50', text: 'text-red-700', label: 'No Show' },
  cancelled:  { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
  rescheduled: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Rescheduled' },
  open:       { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Open' },
  done:       { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Done' },
}

type PanelMode = 'view' | 'complete' | 'no_show' | 'cancel' | 'reschedule'

const CANCEL_REASONS = [
  'Customer requested', 'No longer needed', 'Scheduling conflict',
  'Customer unresponsive', 'Duplicate booking', 'Other',
]
const NO_SHOW_REASONS = [
  'Did not attend', 'Wrong contact details', 'Technical issues',
  'Customer cancelled late', 'Other',
]

export default function CalendarEventPanel({
  event, onClose, onActionComplete,
}: CalendarEventPanelProps) {
  const [mode, setMode] = useState<PanelMode>('view')
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [depositConfirmed, setDepositConfirmed] = useState(false)

  const resetForm = useCallback(() => {
    setMode('view'); setNotes(''); setReason('')
    setRescheduleDate(''); setRescheduleTime(''); setDepositConfirmed(false)
  }, [])

  const callAction = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (!event) return
    setLoading(true)
    try {
      const res = await fetch('/api/crm/calendar/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, eventType: event.eventType, action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.depositWarning) {
          toast.error('Deposit paid — please confirm cancellation'); return
        }
        throw new Error(data.error || 'Action failed')
      }
      toast.success(data.message || 'Done')
      resetForm(); onActionComplete(); onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }, [event, onActionComplete, onClose, resetForm])

  if (!event) return null

  const Icon = typeIcons[event.eventType] ?? Calendar
  const label = typeLabels[event.eventType] ?? event.eventType
  const outcome = outcomeStyles[event.outcome] ?? outcomeStyles.pending
  const isPending = event.outcome === 'pending' || event.outcome === 'open'
  const hasDeposit = !!event.depositPaid
  const reschedules = event.rescheduleCount ?? 0
  const noShows = event.noShowCount ?? 0

  function handleComplete() {
    if (!notes.trim()) { toast.error('Please add notes before completing'); return }
    callAction('complete', { notes: notes.trim() })
  }
  function handleNoShow() {
    if (!reason) { toast.error('Please select a reason'); return }
    callAction('no_show', { reason, notes: notes.trim() || undefined })
  }
  function handleCancel() {
    if (!reason) { toast.error('Please select a reason'); return }
    const extra: Record<string, unknown> = { reason, notes: notes.trim() || undefined }
    if (hasDeposit) extra.confirm = depositConfirmed
    callAction('cancel', extra)
  }
  function handleReschedule() {
    if (!rescheduleDate || !rescheduleTime) { toast.error('Please select a date and time'); return }
    callAction('reschedule', { scheduled_at: `${rescheduleDate}T${rescheduleTime}:00`, notes: notes.trim() || undefined })
  }

  function copyMeetLink() {
    if (event?.meetLink) {
      navigator.clipboard.writeText(event.meetLink)
      toast.success('Meet link copied')
    }
  }

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => { resetForm(); onClose() }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[var(--warm-100)] px-6 py-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${event.color.bg}`}>
                    <Icon size={18} className={event.color.text} />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--warm-900)]">{label}</h2>
                    <p className="text-sm text-[var(--warm-500)]">{event.title}</p>
                  </div>
                </div>
                <button onClick={() => { resetForm(); onClose() }} className="p-2 hover:bg-[var(--warm-50)] rounded-lg transition-colors">
                  <X size={18} className="text-[var(--warm-400)]" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Status + badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${outcome.bg} ${outcome.text}`}>
                  {outcome.label}
                </span>
                {event.package && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    event.package === 'select' ? 'bg-amber-50 text-amber-700' :
                    event.package === 'standard' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {event.package.charAt(0).toUpperCase() + event.package.slice(1)}
                  </span>
                )}
                {event.stage && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--warm-50)] text-[var(--warm-600)]">
                    {event.stage.replace(/_/g, ' ')}
                  </span>
                )}
                {reschedules > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
                    <RefreshCw size={10} /> {reschedules}x rescheduled
                  </span>
                )}
                {noShows > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                    <AlertTriangle size={10} /> {noShows}x no-show
                  </span>
                )}
              </div>

              {/* Warnings */}
              {hasDeposit && isPending && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">Deposit has been paid. Cancellation requires explicit confirmation and may need a refund.</p>
                </div>
              )}
              {reschedules >= 2 && isPending && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <RefreshCw size={16} className="text-orange-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-orange-700">This event has been rescheduled {reschedules} times. Consider reaching out to confirm commitment.</p>
                </div>
              )}

              {/* Date & Time */}
              <div className="bg-[var(--warm-50)]/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-[var(--warm-400)]" />
                  <span className="text-sm text-[var(--warm-700)] font-medium">
                    {format(parseISO(event.startTime), 'EEEE, d MMMM yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[var(--warm-400)]" />
                  <span className="text-sm text-[var(--warm-700)]">
                    {format(parseISO(event.startTime), 'HH:mm')}
                    {event.durationMin && ` — ${event.durationMin} min`}
                  </span>
                </div>
                {event.address && (
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-[var(--warm-400)]" />
                    <span className="text-sm text-[var(--warm-700)]">{event.address}</span>
                  </div>
                )}
              </div>

              {/* Meet Link */}
              {event.meetLink && (
                <div className="bg-blue-50/50 rounded-xl p-4">
                  <p className="text-xs text-blue-500 font-medium mb-2">Video Call</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Video size={16} />
                      Join Meet
                    </a>
                    <button
                      onClick={copyMeetLink}
                      className="p-2.5 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                    >
                      <Copy size={16} className="text-blue-600" />
                    </button>
                  </div>
                  <p className="text-[10px] text-blue-400 mt-2 truncate">{event.meetLink}</p>
                </div>
              )}

              {/* Value */}
              {event.value && (
                <div className="flex items-center justify-between bg-[var(--warm-50)]/50 rounded-xl p-4">
                  <span className="text-sm text-[var(--warm-500)]">Estimated Value</span>
                  <span className="text-lg font-semibold text-[var(--warm-900)]">
                    £{Number(event.value).toLocaleString('en-GB')}
                  </span>
                </div>
              )}

              {/* Lead link */}
              {event.leadId && (
                <a
                  href={`/crm/leads/${event.leadId}`}
                  className="flex items-center gap-3 p-4 bg-[var(--warm-50)]/50 rounded-xl hover:bg-[var(--warm-50)] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--warm-100)] flex items-center justify-center">
                    <User size={14} className="text-[var(--warm-500)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--warm-700)] group-hover:text-[var(--green-700)] transition-colors">
                      {event.title}
                    </p>
                    <p className="text-xs text-[var(--warm-400)]">View lead details</p>
                  </div>
                  <ChevronRight size={16} className="text-[var(--warm-300)] group-hover:text-[var(--green-500)] transition-colors" />
                </a>
              )}

              {/* AI Suggestion */}
              {event.aiSuggestion && (
                <div className="bg-purple-50/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-purple-500" />
                    <span className="text-xs font-medium text-purple-600">AI Suggestion</span>
                  </div>
                  <p className="text-sm text-purple-800">{event.aiSuggestion.reasoning}</p>
                  <p className="text-xs text-purple-500 mt-1">
                    Suggested stage: {event.aiSuggestion.stage} ({Math.round(event.aiSuggestion.confidence * 100)}% confidence)
                  </p>
                </div>
              )}

              {/* ── ACTION BUTTONS (view mode) ──────────────────── */}
              {isPending && mode === 'view' && (
                <div className="space-y-2 pt-2 border-t border-[var(--warm-100)]">
                  <p className="text-xs font-medium text-[var(--warm-400)] uppercase tracking-wider">Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMode('complete')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
                      <CheckCircle2 size={16} /> Complete
                    </button>
                    <button onClick={() => setMode('reschedule')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-100 transition-colors">
                      <RefreshCw size={16} /> Reschedule
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMode('no_show')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors">
                      <AlertTriangle size={16} /> No Show
                    </button>
                    <button onClick={() => setMode('cancel')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--warm-50)] text-[var(--warm-500)] text-sm font-medium rounded-xl hover:bg-[var(--warm-100)] transition-colors">
                      <XCircle size={16} /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ── COMPLETE FORM ───────────────────────────────── */}
              {mode === 'complete' && (
                <ActionForm title="Complete Event" onBack={() => setMode('view')}>
                  <label className="text-xs font-medium text-[var(--warm-600)]">Notes <span className="text-red-400">*</span></label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Outcome, next steps, key points discussed..."
                    className="w-full px-3 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-none" rows={4} />
                  <SubmitBtn label="Mark Complete" color="emerald" loading={loading} onClick={handleComplete} />
                </ActionForm>
              )}

              {/* ── RESCHEDULE FORM ─────────────────────────────── */}
              {mode === 'reschedule' && (
                <ActionForm title="Reschedule Event" onBack={() => setMode('view')}>
                  {reschedules >= 2 && (
                    <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                      Already rescheduled {reschedules} times — consider whether to proceed.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[var(--warm-600)]">Date <span className="text-red-400">*</span></label>
                      <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--warm-600)]">Time <span className="text-red-400">*</span></label>
                      <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                    </div>
                  </div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Reason for rescheduling (optional)..."
                    className="w-full px-3 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-none" rows={2} />
                  <SubmitBtn label="Confirm Reschedule" color="blue" loading={loading} onClick={handleReschedule} />
                </ActionForm>
              )}

              {/* ── NO-SHOW FORM ────────────────────────────────── */}
              {mode === 'no_show' && (
                <ActionForm title="Mark as No Show" onBack={() => setMode('view')}>
                  <label className="text-xs font-medium text-[var(--warm-600)]">Reason <span className="text-red-400">*</span></label>
                  <select value={reason} onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                    <option value="">Select reason...</option>
                    {NO_SHOW_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Additional notes (optional)..."
                    className="w-full px-3 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-none" rows={2} />
                  <SubmitBtn label="Confirm No Show" color="red" loading={loading} onClick={handleNoShow} />
                </ActionForm>
              )}

              {/* ── CANCEL FORM ─────────────────────────────────── */}
              {mode === 'cancel' && (
                <ActionForm title="Cancel Event" onBack={() => setMode('view')}>
                  {hasDeposit && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-amber-700">
                        <p className="font-medium">Deposit has been paid</p>
                        <p>Cancelling may require a refund. Please confirm below.</p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input type="checkbox" checked={depositConfirmed} onChange={e => setDepositConfirmed(e.target.checked)}
                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                          <span>I understand a refund may be needed</span>
                        </label>
                      </div>
                    </div>
                  )}
                  <label className="text-xs font-medium text-[var(--warm-600)]">Reason <span className="text-red-400">*</span></label>
                  <select value={reason} onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                    <option value="">Select reason...</option>
                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Additional notes (optional)..."
                    className="w-full px-3 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-none" rows={2} />
                  <SubmitBtn label="Confirm Cancellation" color="red" loading={loading}
                    disabled={hasDeposit && !depositConfirmed} onClick={handleCancel} />
                </ActionForm>
              )}

              {/* Google Calendar link */}
              {event.googleEventId && (
                <a
                  href={`https://calendar.google.com/calendar/event?eid=${event.googleEventId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors"
                >
                  <ExternalLink size={12} />
                  View in Google Calendar
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function ActionForm({ title, onBack, children }: {
  title: string; onBack: () => void; children: React.ReactNode
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-[var(--warm-100)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--warm-800)]">{title}</p>
        <button onClick={onBack} className="text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors">
          ← Back
        </button>
      </div>
      {children}
    </div>
  )
}

function SubmitBtn({ label, color, loading, disabled, onClick }: {
  label: string; color: string; loading: boolean; disabled?: boolean; onClick: () => void
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
  }
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors[color] ?? colors.emerald}`}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {label}
    </button>
  )
}
