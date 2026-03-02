'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Phone, Video, Home, Wrench, Calendar, Clock, MapPin,
  ExternalLink, Copy, CheckCircle2, XCircle, AlertTriangle,
  MessageSquare, ChevronRight, Sparkles, User,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CalendarEvent } from './CalendarTypes'

interface CalendarEventPanelProps {
  event: CalendarEvent | null
  onClose: () => void
  onMarkComplete: (id: string, type: CalendarEvent['eventType']) => void
  onMarkNoShow: (id: string, type: CalendarEvent['eventType']) => void
  onCancel: (id: string, type: CalendarEvent['eventType']) => void
  onSaveNotes: (id: string, notes: string) => void
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

export default function CalendarEventPanel({
  event,
  onClose,
  onMarkComplete,
  onMarkNoShow,
  onCancel,
  onSaveNotes,
}: CalendarEventPanelProps) {
  const [notes, setNotes] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)

  if (!event) return null

  const Icon = typeIcons[event.eventType] ?? Calendar
  const label = typeLabels[event.eventType] ?? event.eventType
  const outcome = outcomeStyles[event.outcome] ?? outcomeStyles.pending
  const isPending = event.outcome === 'pending' || event.outcome === 'open'
  const isVideoCall = event.eventType === 'call1' || event.eventType === 'call2'

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
            onClick={onClose}
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
                <button onClick={onClose} className="p-2 hover:bg-[var(--warm-50)] rounded-lg transition-colors">
                  <X size={18} className="text-[var(--warm-400)]" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Status badge */}
              <div className="flex items-center gap-2">
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
              </div>

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

              {/* Notes */}
              {(event.eventType !== 'task') && (
                <div>
                  <button
                    onClick={() => setNotesOpen(!notesOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--warm-600)] hover:text-[var(--warm-800)] transition-colors"
                  >
                    <MessageSquare size={14} />
                    {event.notes ? 'View Notes' : 'Add Notes'}
                    <ChevronRight size={14} className={`transition-transform ${notesOpen ? 'rotate-90' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {notesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3">
                          <textarea
                            value={notes || event.notes || ''}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes about this event..."
                            className="w-full px-3 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-none"
                            rows={4}
                          />
                          <button
                            onClick={() => {
                              onSaveNotes(event.id, notes || event.notes || '')
                              toast.success('Notes saved')
                            }}
                            className="mt-2 px-4 py-2 text-xs font-medium bg-[var(--green-600)] text-white rounded-xl hover:bg-[var(--green-700)] transition-colors"
                          >
                            Save Notes
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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

              {/* Actions */}
              {isPending && (
                <div className="space-y-2 pt-2 border-t border-[var(--warm-100)]">
                  <p className="text-xs font-medium text-[var(--warm-400)] uppercase tracking-wider">Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onMarkComplete(event.id, event.eventType)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Complete
                    </button>
                    <button
                      onClick={() => onMarkNoShow(event.id, event.eventType)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <AlertTriangle size={16} />
                      No Show
                    </button>
                  </div>
                  <button
                    onClick={() => onCancel(event.id, event.eventType)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--warm-50)] text-[var(--warm-500)] text-sm font-medium rounded-xl hover:bg-[var(--warm-100)] transition-colors"
                  >
                    <XCircle size={16} />
                    Cancel Event
                  </button>
                </div>
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
