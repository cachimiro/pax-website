'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, AlertCircle, ArrowLeft, MapPin, Calendar, Clock, Phone,
  CheckCircle2, Circle, ChevronDown, ChevronRight, Save, Play, Camera, FileSignature,
  Navigation, PoundSterling, Timer, FileText, Info, Package,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInSeconds, parseISO } from 'date-fns'
import {
  CHECKLIST_BEFORE, CHECKLIST_AFTER, initChecklist,
  type FittingJob, type ChecklistData, type ChecklistItem
} from '@/lib/fitter/types'

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }[]> = {
  assigned:    [{ next: 'accepted',    label: 'Accept Job',       color: 'bg-blue-600' }],
  claimed:     [{ next: 'accepted',    label: 'Accept Job',       color: 'bg-blue-600' }],
  accepted:    [{ next: 'en_route',    label: "I'm on my way",    color: 'bg-amber-500' },
                { next: 'in_progress', label: 'Start Fitting',    color: 'bg-amber-600' }],
  en_route:    [{ next: 'in_progress', label: 'Start Fitting',    color: 'bg-amber-600' }],
  in_progress: [{ next: 'completed',   label: 'Mark Complete',    color: 'bg-green-600' }],
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(() => differenceInSeconds(parseISO(expiresAt), new Date()))
  useEffect(() => {
    const t = setInterval(() => setSecs(differenceInSeconds(parseISO(expiresAt), new Date())), 1000)
    return () => clearInterval(t)
  }, [expiresAt])
  if (secs <= 0) return <span className="text-red-600 text-xs font-semibold">Offer expired</span>
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return (
    <span className={`text-xs font-mono font-semibold ${secs < 3600 ? 'text-red-600' : 'text-amber-600'}`}>
      Expires in: {h > 0 ? `${h}h ` : ''}{String(m).padStart(2,'0')}m {String(s).padStart(2,'0')}s
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function FitterJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<FittingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [beforeOpen, setBeforeOpen] = useState(true)
  const [afterOpen, setAfterOpen] = useState(false)

  // Local checklist state with localStorage persistence
  const [checkBefore, setCheckBeforeRaw] = useState<ChecklistData>(initChecklist(CHECKLIST_BEFORE))
  const [checkAfter, setCheckAfterRaw] = useState<ChecklistData>(initChecklist(CHECKLIST_AFTER))

  const lsKey = `pax-checklist-${id}`

  function setCheckBefore(data: ChecklistData) {
    setCheckBeforeRaw(data)
    try {
      const stored = JSON.parse(localStorage.getItem(lsKey) || '{}')
      localStorage.setItem(lsKey, JSON.stringify({ ...stored, before: data, ts: Date.now() }))
    } catch { /* ignore */ }
  }

  function setCheckAfter(data: ChecklistData) {
    setCheckAfterRaw(data)
    try {
      const stored = JSON.parse(localStorage.getItem(lsKey) || '{}')
      localStorage.setItem(lsKey, JSON.stringify({ ...stored, after: data, ts: Date.now() }))
    } catch { /* ignore */ }
  }

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/fitter/jobs/${id}`)
      if (!res.ok) throw new Error('Failed to load job')
      const data = await res.json()
      setJob(data.job)

      // Initialize checklists: prefer localStorage if it has more progress
      const dbBefore = data.job.checklist_before?.items?.length
        ? data.job.checklist_before
        : initChecklist(CHECKLIST_BEFORE)
      const dbAfter = data.job.checklist_after?.items?.length
        ? data.job.checklist_after
        : initChecklist(CHECKLIST_AFTER)

      let before = dbBefore
      let after = dbAfter

      try {
        const stored = JSON.parse(localStorage.getItem(lsKey) || '{}')
        if (stored.before?.items?.length) {
          const lsChecked = stored.before.items.filter((i: { checked: boolean }) => i.checked).length
          const dbChecked = dbBefore.items.filter((i: { checked: boolean }) => i.checked).length
          if (lsChecked >= dbChecked) before = stored.before
        }
        if (stored.after?.items?.length) {
          const lsChecked = stored.after.items.filter((i: { checked: boolean }) => i.checked).length
          const dbChecked = dbAfter.items.filter((i: { checked: boolean }) => i.checked).length
          if (lsChecked >= dbChecked) after = stored.after
        }
      } catch { /* ignore */ }

      setCheckBeforeRaw(before)
      setCheckAfterRaw(after)

      // Auto-expand the relevant section
      if (['assigned', 'accepted'].includes(data.job.status)) {
        setBeforeOpen(true)
        setAfterOpen(false)
      } else if (data.job.status === 'in_progress') {
        setBeforeOpen(false)
        setAfterOpen(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load job')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  function toggleItem(
    checklist: ChecklistData,
    setChecklist: (c: ChecklistData) => void,
    key: string
  ) {
    setChecklist({
      ...checklist,
      items: checklist.items.map(item =>
        item.key === key ? { ...item, checked: !item.checked } : item
      ),
    })
  }

  function setItemNote(
    checklist: ChecklistData,
    setChecklist: (c: ChecklistData) => void,
    key: string,
    note: string
  ) {
    setChecklist({
      ...checklist,
      items: checklist.items.map(item =>
        item.key === key ? { ...item, note } : item
      ),
    })
  }

  async function saveChecklists() {
    setSaving(true)
    try {
      const res = await fetch(`/api/fitter/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_before: checkBefore,
          checklist_after: checkAfter,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      setJob(data.job)
      // Clear localStorage after successful sync
      try { localStorage.removeItem(lsKey) } catch { /* ignore */ }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function advanceStatus(nextStatus: string) {
    if (!job) return
    setAdvancing(true)
    try {
      const res = await fetch(`/api/fitter/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          checklist_before: checkBefore,
          checklist_after: checkAfter,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }
      const data = await res.json()
      setJob(data.job)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to advance')
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
      </div>
    )
  }

  if (!job) return null

  const actions = STATUS_FLOW[job.status] ?? []
  const beforeCount = checkBefore.items.filter(i => i.checked).length
  const afterCount = checkAfter.items.filter(i => i.checked).length
  const isReadOnly = ['completed', 'signed_off', 'approved', 'rejected', 'cancelled'].includes(job.status)
  const hasJobPack = job.scope_of_work || job.access_notes || job.parking_info || job.ikea_order_ref || job.special_instructions

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/fitter')}
          className="p-2 hover:bg-[var(--warm-100)] rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--warm-400)]">{job.job_code}</span>
            <StatusBadge status={job.status} />
          </div>
          <h1 className="text-lg font-bold text-[var(--warm-900)]">{job.customer_name || 'Customer'}</h1>
        </div>
      </div>

      {/* Offer expiry countdown */}
      {job.status === 'offered' && job.offer_expires_at && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Timer size={13} className="text-amber-500 shrink-0" />
          <ExpiryCountdown expiresAt={job.offer_expires_at} />
        </div>
      )}

      {/* Job info */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 space-y-2">
        {/* Fee + duration strip */}
        {(job.fitting_fee != null || job.estimated_duration_hours > 0) && (
          <div className="flex items-center gap-4 pb-2 border-b border-[var(--warm-50)]">
            {job.fitting_fee != null && (
              <div className="flex items-center gap-1.5">
                <PoundSterling size={14} className="text-[var(--green-600)]" />
                <span className="text-base font-bold text-[var(--green-700)]">£{Number(job.fitting_fee).toLocaleString('en-GB')}</span>
              </div>
            )}
            {job.estimated_duration_hours > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--warm-500)]">
                <Timer size={13} />
                <span>{job.estimated_duration_hours}h estimated</span>
              </div>
            )}
          </div>
        )}
        {job.customer_address && (
          <div className="flex items-start gap-2 text-sm text-[var(--warm-600)]">
            <MapPin size={14} className="shrink-0 text-[var(--warm-400)] mt-0.5" />
            <div className="flex-1 min-w-0">
              <span>{job.customer_address}</span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.customer_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 font-medium"
              >
                <Navigation size={10} /> Directions
              </a>
            </div>
          </div>
        )}
        {job.scheduled_date && (
          <div className="flex items-center gap-2 text-sm text-[var(--warm-600)]">
            <Calendar size={14} className="shrink-0 text-[var(--warm-400)]" />
            {formatDate(job.scheduled_date)}
          </div>
        )}
        {job.customer_phone && (
          <a href={`tel:${job.customer_phone}`}
            className="flex items-center gap-2 text-sm text-[var(--green-600)]">
            <Phone size={14} className="shrink-0" />
            {job.customer_phone}
          </a>
        )}
        {job.notes_before && (
          <div className="text-sm text-[var(--warm-500)] bg-[var(--warm-50)] rounded-lg p-3 mt-2">
            <span className="text-xs font-medium text-[var(--warm-600)]">Notes:</span><br />
            {job.notes_before}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Before Checklist */}
      <ChecklistSection
        title="Before Fitting"
        subtitle={`${beforeCount}/${checkBefore.items.length} completed`}
        open={beforeOpen}
        onToggle={() => setBeforeOpen(!beforeOpen)}
        items={checkBefore.items}
        readOnly={isReadOnly}
        onToggleItem={(key) => toggleItem(checkBefore, setCheckBefore, key)}
        onSetNote={(key, note) => setItemNote(checkBefore, setCheckBefore, key, note)}
        progress={beforeCount / checkBefore.items.length}
      />

      {/* After Checklist */}
      <ChecklistSection
        title="After Fitting"
        subtitle={`${afterCount}/${checkAfter.items.length} completed`}
        open={afterOpen}
        onToggle={() => setAfterOpen(!afterOpen)}
        items={checkAfter.items}
        readOnly={isReadOnly}
        onToggleItem={(key) => toggleItem(checkAfter, setCheckAfter, key)}
        onSetNote={(key, note) => setItemNote(checkAfter, setCheckAfter, key, note)}
        progress={afterCount / checkAfter.items.length}
      />

      {/* Job pack */}
      {hasJobPack && (
        <div className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--warm-50)] flex items-center gap-2">
            <FileText size={13} className="text-[var(--warm-400)]" />
            <span className="text-xs font-semibold text-[var(--warm-600)] uppercase tracking-wider">Job Pack</span>
          </div>
          <div className="p-4 space-y-3">
            {job.scope_of_work && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-1">Scope of Work</p>
                <p className="text-sm text-[var(--warm-700)] whitespace-pre-wrap">{job.scope_of_work}</p>
              </div>
            )}
            {job.access_notes && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-1">Access Notes</p>
                <p className="text-sm text-[var(--warm-700)]">{job.access_notes}</p>
              </div>
            )}
            {job.parking_info && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-1">Parking</p>
                <p className="text-sm text-[var(--warm-700)]">{job.parking_info}</p>
              </div>
            )}
            {job.ikea_order_ref && (
              <div className="flex items-center gap-2">
                <Package size={13} className="text-[var(--warm-400)]" />
                <span className="text-xs text-[var(--warm-500)]">IKEA Ref:</span>
                <span className="text-xs font-mono font-semibold text-[var(--warm-800)]">{job.ikea_order_ref}</span>
              </div>
            )}
            {job.special_instructions && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <Info size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{job.special_instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photos link with thumbnails */}
      {!isReadOnly && (
        <Link href={`/fitter/job/${id}/photos`}
          className="flex items-center gap-3 bg-white rounded-xl border border-[var(--warm-100)] p-4 hover:border-[var(--green-300)] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[var(--green-50)] flex items-center justify-center shrink-0">
            <Camera size={20} className="text-[var(--green-600)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--warm-900)]">Photos & Videos</div>
            <div className="text-xs text-[var(--warm-500)]">
              {(job.photos_before?.length || 0) + (job.photos_after?.length || 0)} photos · {job.videos?.length || 0} videos
              {(job.photos_before?.length || 0) < 5 && (
                <span className="ml-1.5 text-amber-600 font-medium">· {5 - (job.photos_before?.length || 0)} before photos needed</span>
              )}
            </div>
            {/* Thumbnail strip */}
            {(job.photos_before?.length > 0 || job.photos_after?.length > 0) && (
              <div className="flex gap-1 mt-2 overflow-x-auto">
                {[...(job.photos_before || []), ...(job.photos_after || [])].slice(0, 5).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 border border-[var(--warm-100)]" />
                ))}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-[var(--warm-300)] shrink-0" />
        </Link>
      )}

      {/* Sign-off link (when job is completed) */}
      {job.status === 'completed' && (
        <Link href={`/fitter/job/${id}/sign-off`}
          className="flex items-center gap-3 bg-[var(--green-50)] rounded-xl border border-[var(--green-200)] p-4 hover:border-[var(--green-400)] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[var(--green-100)] flex items-center justify-center">
            <FileSignature size={20} className="text-[var(--green-600)]" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-[var(--green-800)]">Get Sign-Off</div>
            <div className="text-xs text-[var(--green-600)]">In-person or send remote link</div>
          </div>
          <ChevronRight size={16} className="text-[var(--green-400)]" />
        </Link>
      )}

      {/* Action buttons */}
      {!isReadOnly && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <button onClick={saveChecklists} disabled={saving}
              className="flex-1 py-3 bg-white border border-[var(--warm-200)] text-[var(--warm-700)] text-sm font-medium rounded-xl hover:bg-[var(--warm-50)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Progress
            </button>
            {/* Primary action — last in the actions array */}
            {actions.length > 0 && (
              <button onClick={() => advanceStatus(actions[actions.length - 1].next)} disabled={advancing}
                className={`flex-1 py-3 ${actions[actions.length - 1].color} text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2`}>
                {advancing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {actions[actions.length - 1].label}
              </button>
            )}
          </div>
          {/* Secondary action (e.g. "I'm on my way" when accepted) */}
          {actions.length > 1 && (
            <button onClick={() => advanceStatus(actions[0].next)} disabled={advancing}
              className={`w-full py-2.5 ${actions[0].color} text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2`}>
              <Navigation size={14} />
              {actions[0].label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, { label: string; className: string }> = {
    offered:     { label: 'Offer',       className: 'bg-amber-100 text-amber-700' },
    assigned:    { label: 'Assigned',    className: 'bg-blue-100 text-blue-700' },
    claimed:     { label: 'Claimed',     className: 'bg-blue-100 text-blue-700' },
    accepted:    { label: 'Accepted',    className: 'bg-indigo-100 text-indigo-700' },
    en_route:    { label: 'On the way',  className: 'bg-sky-100 text-sky-700' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
    completed:   { label: 'Completed',   className: 'bg-green-100 text-green-700' },
    signed_off:  { label: 'Signed Off',  className: 'bg-emerald-100 text-emerald-700' },
    approved:    { label: 'Approved',    className: 'bg-teal-100 text-teal-700' },
    rejected:    { label: 'Rejected',    className: 'bg-red-100 text-red-700' },
    cancelled:   { label: 'Cancelled',   className: 'bg-gray-100 text-gray-500' },
  }
  const b = badges[status] || badges.assigned
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${b.className}`}>
      {b.label}
    </span>
  )
}

function ChecklistSection({
  title, subtitle, open, onToggle, items, readOnly,
  onToggleItem, onSetNote, progress,
}: {
  title: string
  subtitle: string
  open: boolean
  onToggle: () => void
  items: ChecklistItem[]
  readOnly: boolean
  onToggleItem: (key: string) => void
  onSetNote: (key: string, note: string) => void
  progress: number
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
      <button onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left">
        <div>
          <div className="text-sm font-semibold text-[var(--warm-900)]">{title}</div>
          <div className="text-xs text-[var(--warm-500)]">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <svg width="28" height="28" className="-rotate-90">
            <circle cx="14" cy="14" r="11" fill="none" stroke="var(--warm-100)" strokeWidth="3" />
            <circle cx="14" cy="14" r="11" fill="none"
              stroke={progress === 1 ? 'var(--green-500)' : 'var(--brand)'}
              strokeWidth="3"
              strokeDasharray={`${progress * 69.1} 69.1`}
              strokeLinecap="round" />
          </svg>
          {open ? <ChevronDown size={16} className="text-[var(--warm-400)]" /> : <ChevronRight size={16} className="text-[var(--warm-400)]" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1 border-t border-[var(--warm-50)]">
              {items.map(item => (
                <ChecklistRow
                  key={item.key}
                  item={item}
                  readOnly={readOnly}
                  onToggle={() => onToggleItem(item.key)}
                  onSetNote={(note) => onSetNote(item.key, note)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ChecklistRow({
  item, readOnly, onToggle, onSetNote,
}: {
  item: ChecklistItem
  readOnly: boolean
  onToggle: () => void
  onSetNote: (note: string) => void
}) {
  const [showNote, setShowNote] = useState(!!item.note)

  return (
    <div className="py-2">
      <div className="flex items-start gap-3">
        <button onClick={readOnly ? undefined : onToggle}
          className={`mt-0.5 shrink-0 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
          {item.checked ? (
            <CheckCircle2 size={20} className="text-[var(--green-500)]" />
          ) : (
            <Circle size={20} className="text-[var(--warm-300)]" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${item.checked ? 'text-[var(--warm-500)] line-through' : 'text-[var(--warm-800)]'}`}>
            {item.label}
          </div>
          {!readOnly && !showNote && (
            <button onClick={() => setShowNote(true)}
              className="text-[11px] text-[var(--warm-400)] hover:text-[var(--warm-600)] mt-0.5">
              + Add note
            </button>
          )}
          {showNote && (
            <input
              type="text"
              value={item.note || ''}
              onChange={e => onSetNote(e.target.value)}
              placeholder="Add a note..."
              readOnly={readOnly}
              className="w-full mt-1 px-2 py-1 text-xs border border-[var(--warm-100)] rounded-lg focus:border-[var(--green-400)] focus:outline-none"
            />
          )}
        </div>
      </div>
    </div>
  )
}
