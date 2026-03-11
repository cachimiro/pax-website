'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  X, Loader2, User, MapPin, Calendar, Phone, CheckCircle2, Circle,
  Camera, Video, MessageSquare, ThumbsUp, ThumbsDown, Send, AlertCircle, AlertTriangle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FittingMessage } from '@/lib/fitter/types'

interface FittingDetailPanelProps {
  jobId: string | null
  onClose: () => void
  onUpdated: () => void
}

interface JobDetail {
  id: string
  job_code: string
  status: string
  scheduled_date: string | null
  customer_name: string | null
  customer_address: string | null
  customer_phone: string | null
  notes: string | null
  checklist_before: { items: { key: string; label: string; checked: boolean; note?: string }[] } | null
  checklist_after: { items: { key: string; label: string; checked: boolean; note?: string }[] } | null
  photos_before: string[]
  photos_after: string[]
  videos: string[]
  fitter_signature: string | null
  customer_signature: string | null
  customer_signer_name: string | null
  sign_off_method: string | null
  customer_signed_at: string | null
  rejection_reason: string | null
  fitting_fee: number | null
  subcontractors: { name: string; email: string; phone: string | null } | null
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  assigned:    { label: 'Assigned',    className: 'bg-blue-100 text-blue-700' },
  accepted:    { label: 'Accepted',    className: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Completed',   className: 'bg-green-100 text-green-700' },
  signed_off:  { label: 'Signed Off',  className: 'bg-emerald-100 text-emerald-700' },
  approved:    { label: 'Approved',    className: 'bg-teal-100 text-teal-700' },
  rejected:    { label: 'Rejected',    className: 'bg-red-100 text-red-700' },
}

export default function FittingDetailPanel({ jobId, onClose, onUpdated }: FittingDetailPanelProps) {
  const [job, setJob] = useState<JobDetail | null>(null)
  const [messages, setMessages] = useState<FittingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'details' | 'photos' | 'messages'>('details')
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)

  const fetchJob = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const [jobRes, msgRes] = await Promise.all([
        fetch(`/api/crm/fittings/${jobId}`),
        fetch(`/api/crm/fittings/${jobId}/messages`),
      ])
      if (jobRes.ok) {
        const d = await jobRes.json()
        setJob(d.job)
      }
      if (msgRes.ok) {
        const d = await msgRes.json()
        setMessages(d.messages || [])
      }
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { fetchJob() }, [fetchJob])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleAction(action: 'approve' | 'reject') {
    if (!jobId) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/crm/fittings/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: action === 'reject' ? rejectReason : undefined }),
      })
      if (res.ok) {
        const d = await res.json()
        setJob(d.job)
        onUpdated()
        setShowReject(false)
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSendMessage() {
    if (!jobId || !msgText.trim()) return
    setSendingMsg(true)
    try {
      await fetch(`/api/crm/fittings/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText.trim() }),
      })
      setMsgText('')
      // Refresh messages
      const res = await fetch(`/api/crm/fittings/${jobId}/messages`)
      if (res.ok) {
        const d = await res.json()
        setMessages(d.messages || [])
      }
    } finally {
      setSendingMsg(false)
    }
  }

  return (
    <AnimatePresence>
      {jobId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--warm-100)]">
              <div>
                {job && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--warm-400)]">{job.job_code}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        (STATUS_BADGES[job.status] || STATUS_BADGES.assigned).className
                      }`}>
                        {(STATUS_BADGES[job.status] || STATUS_BADGES.assigned).label}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[var(--warm-900)]">{job.customer_name}</div>
                  </>
                )}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[var(--warm-50)] rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--warm-100)]">
              {(['details', 'photos', 'messages'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    tab === t ? 'text-[var(--brand)] border-b-2 border-[var(--brand)]' : 'text-[var(--warm-500)]'
                  }`}>
                  {t === 'details' ? 'Details' : t === 'photos' ? `Photos (${
                    (job?.photos_before?.length || 0) + (job?.photos_after?.length || 0)
                  })` : `Messages (${messages.length})`}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--brand)]" />
                </div>
              ) : !job ? (
                <div className="p-4 text-sm text-[var(--warm-500)]">Job not found</div>
              ) : (
                <>
                  {tab === 'details' && <DetailsTab job={job} />}
                  {tab === 'photos' && <PhotosTab job={job} />}
                  {tab === 'messages' && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {messages.length === 0 ? (
                          <div className="text-center py-8 text-sm text-[var(--warm-400)]">No messages</div>
                        ) : (
                          messages.map(msg => (
                            <div key={msg.id}
                              className={`flex ${msg.sender_type === 'office' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                                msg.sender_type === 'office'
                                  ? 'bg-[var(--brand)] text-white rounded-br-md'
                                  : 'bg-[var(--warm-50)] text-[var(--warm-800)] rounded-bl-md'
                              }`}>
                                <p className="text-sm">{msg.message}</p>
                                <div className={`text-[10px] mt-1 ${
                                  msg.sender_type === 'office' ? 'text-white/60' : 'text-[var(--warm-400)]'
                                }`}>
                                  {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={msgEndRef} />
                      </div>
                      <div className="border-t border-[var(--warm-100)] p-3 flex gap-2">
                        <input type="text" value={msgText} onChange={e => setMsgText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Message fitter..."
                          className="flex-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--brand)] focus:outline-none" />
                        <button onClick={handleSendMessage} disabled={!msgText.trim() || sendingMsg}
                          className="px-3 py-2 bg-[var(--brand)] text-white rounded-lg disabled:opacity-50">
                          {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            {job && job.status === 'signed_off' && (
              <div className="border-t border-[var(--warm-100)] p-4 space-y-3">
                {/* Readiness checks */}
                {(() => {
                  const afterItems = job.checklist_after?.items ?? []
                  const afterDone = afterItems.filter(i => i.checked).length
                  const afterPct = afterItems.length > 0 ? Math.round((afterDone / afterItems.length) * 100) : 100
                  const afterPhotos = job.photos_after?.length ?? 0
                  const warnings: string[] = []
                  if (afterPct < 80) warnings.push(`After checklist only ${afterPct}% complete`)
                  if (afterPhotos < 5) warnings.push(`Only ${afterPhotos}/5 after photos uploaded`)
                  if (!job.fitting_fee) warnings.push('No fitting fee set — fitter won\'t see earnings')
                  return warnings.length > 0 ? (
                    <div className="space-y-1">
                      {warnings.map((w, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle size={11} className="shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  ) : null
                })()}
                {showReject ? (
                  <div className="space-y-2">
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:border-red-400 focus:outline-none resize-none" rows={2} />
                    <div className="flex gap-2">
                      <button onClick={() => setShowReject(false)}
                        className="flex-1 py-2 text-sm border border-[var(--warm-200)] rounded-lg">Cancel</button>
                      <button onClick={() => handleAction('reject')} disabled={actionLoading}
                        className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                        {actionLoading && <Loader2 size={14} className="animate-spin" />} Confirm Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setShowReject(true)}
                      className="flex-1 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-1">
                      <ThumbsDown size={14} /> Reject
                    </button>
                    <button onClick={() => handleAction('approve')} disabled={actionLoading}
                      className="flex-1 py-2 text-sm bg-[var(--green-600)] text-white rounded-lg hover:bg-[var(--green-700)] disabled:opacity-50 flex items-center justify-center gap-1">
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />} Approve
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function DetailsTab({ job }: { job: JobDetail }) {
  return (
    <div className="p-4 space-y-4">
      {/* Info */}
      <div className="space-y-2">
        {job.subcontractors && (
          <div className="flex items-center gap-2 text-sm text-[var(--warm-600)]">
            <User size={14} className="text-[var(--warm-400)]" /> {job.subcontractors.name}
          </div>
        )}
        {job.customer_address && (
          <div className="flex items-center gap-2 text-sm text-[var(--warm-600)]">
            <MapPin size={14} className="text-[var(--warm-400)]" /> {job.customer_address}
          </div>
        )}
        {job.scheduled_date && (
          <div className="flex items-center gap-2 text-sm text-[var(--warm-600)]">
            <Calendar size={14} className="text-[var(--warm-400)]" />
            {new Date(job.scheduled_date).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        )}
        {job.customer_phone && (
          <div className="flex items-center gap-2 text-sm text-[var(--warm-600)]">
            <Phone size={14} className="text-[var(--warm-400)]" /> {job.customer_phone}
          </div>
        )}
      </div>

      {/* Checklists */}
      {(job.checklist_before?.items?.length ?? 0) > 0 && (
        <ChecklistView title="Before Checklist" items={job.checklist_before!.items} />
      )}
      {(job.checklist_after?.items?.length ?? 0) > 0 && (
        <ChecklistView title="After Checklist" items={job.checklist_after!.items} />
      )}

      {/* Signatures */}
      {(job.fitter_signature || job.customer_signature) && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[var(--warm-600)] uppercase">Signatures</h4>
          <div className="grid grid-cols-2 gap-3">
            {job.fitter_signature && (
              <div>
                <div className="text-[10px] text-[var(--warm-500)] mb-1">Fitter</div>
                <img src={job.fitter_signature} alt="Fitter signature" className="border border-[var(--warm-100)] rounded-lg" />
              </div>
            )}
            {job.customer_signature && (
              <div>
                <div className="text-[10px] text-[var(--warm-500)] mb-1">
                  Customer{job.customer_signer_name ? ` (${job.customer_signer_name})` : ''}
                </div>
                <img src={job.customer_signature} alt="Customer signature" className="border border-[var(--warm-100)] rounded-lg" />
              </div>
            )}
          </div>
        </div>
      )}

      {job.rejection_reason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-xs">Rejection Reason</div>
            {job.rejection_reason}
          </div>
        </div>
      )}
    </div>
  )
}

function ChecklistView({ title, items }: { title: string; items: { key: string; label: string; checked: boolean; note?: string }[] }) {
  const done = items.filter(i => i.checked).length
  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--warm-600)] uppercase mb-2">
        {title} ({done}/{items.length})
      </h4>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.key} className="flex items-start gap-2 text-xs">
            {item.checked ? (
              <CheckCircle2 size={14} className="text-[var(--green-500)] mt-0.5 shrink-0" />
            ) : (
              <Circle size={14} className="text-[var(--warm-300)] mt-0.5 shrink-0" />
            )}
            <div>
              <span className={item.checked ? 'text-[var(--warm-600)]' : 'text-[var(--warm-400)]'}>{item.label}</span>
              {item.note && <div className="text-[var(--warm-400)] italic">{item.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChecklistBar({ label, items }: { label: string; items: { checked: boolean }[] }) {
  const done = items.filter(i => i.checked).length
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[var(--warm-500)] font-medium">{label}</span>
        <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
          {done}/{items.length} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-[var(--warm-100)] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PhotosTab({ job }: { job: JobDetail }) {
  const beforeItems = job.checklist_before?.items ?? []
  const afterItems = job.checklist_after?.items ?? []
  const afterPhotos = job.photos_after?.length ?? 0
  const afterPct = afterItems.length > 0 ? Math.round((afterItems.filter(i => i.checked).length / afterItems.length) * 100) : 100
  const approvalReady = afterPct >= 80 && afterPhotos >= 5

  return (
    <div className="p-4 space-y-4">
      {/* Checklist completion summary */}
      {(beforeItems.length > 0 || afterItems.length > 0) && (
        <div className="bg-[var(--warm-50)] rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider">Checklist Completion</p>
          {beforeItems.length > 0 && <ChecklistBar label="Before" items={beforeItems} />}
          {afterItems.length > 0 && <ChecklistBar label="After" items={afterItems} />}
          <div className={`flex items-center gap-1.5 text-[10px] font-medium mt-1 ${approvalReady ? 'text-emerald-600' : 'text-amber-600'}`}>
            {approvalReady
              ? <><CheckCircle2 size={11} /> Ready to approve</>
              : <><AlertTriangle size={11} /> {afterPct < 80 ? `After checklist ${afterPct}%` : ''}{afterPhotos < 5 ? ` · ${afterPhotos}/5 after photos` : ''}</>
            }
          </div>
        </div>
      )}

      {/* Before photos */}
      {job.photos_before?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--warm-600)] uppercase mb-2 flex items-center gap-1">
            <Camera size={12} /> Before ({job.photos_before.length})
            {job.photos_before.length < 5 && (
              <span className="ml-1 text-amber-500 font-normal normal-case">· {5 - job.photos_before.length} more needed</span>
            )}
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {job.photos_before.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* After photos */}
      {job.photos_after?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--warm-600)] uppercase mb-2 flex items-center gap-1">
            <Camera size={12} /> After ({job.photos_after.length})
            {job.photos_after.length < 5 && (
              <span className="ml-1 text-amber-500 font-normal normal-case">· {5 - job.photos_after.length} more needed</span>
            )}
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {job.photos_after.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {job.videos?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--warm-600)] uppercase mb-2 flex items-center gap-1">
            <Video size={12} /> Videos ({job.videos.length})
          </h4>
          <div className="space-y-2">
            {job.videos.map((url, i) => (
              <video key={i} src={url} controls className="w-full rounded-lg" preload="metadata" />
            ))}
          </div>
        </div>
      )}

      {!job.photos_before?.length && !job.photos_after?.length && !job.videos?.length && (
        <div className="text-center py-8 text-sm text-[var(--warm-400)]">No media uploaded yet</div>
      )}
    </div>
  )
}
