'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, AlertCircle, ArrowLeft, MapPin, Calendar, Clock, Phone,
  CheckCircle2, Circle, ChevronDown, ChevronRight, Save, Play, Camera, FileSignature
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CHECKLIST_BEFORE, CHECKLIST_AFTER, initChecklist,
  type FittingJob, type ChecklistData, type ChecklistItem
} from '@/lib/fitter/types'

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  assigned:    { next: 'accepted',    label: 'Accept Job',       color: 'bg-blue-600' },
  accepted:    { next: 'in_progress', label: 'Start Fitting',    color: 'bg-amber-600' },
  in_progress: { next: 'completed',   label: 'Mark Complete',    color: 'bg-green-600' },
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

  async function advanceStatus() {
    if (!job) return
    const flow = STATUS_FLOW[job.status]
    if (!flow) return

    setAdvancing(true)
    try {
      // Save checklists first
      const res = await fetch(`/api/fitter/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: flow.next,
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

  const flow = STATUS_FLOW[job.status]
  const beforeCount = checkBefore.items.filter(i => i.checked).length
  const afterCount = checkAfter.items.filter(i => i.checked).length
  const isReadOnly = ['completed', 'signed_off', 'approved', 'rejected', 'cancelled'].includes(job.status)

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

      {/* Job info */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 space-y-2">
        {job.customer_address && (
          <div className="flex items-center gap-2 text-sm text-[var(--warm-600)]">
            <MapPin size={14} className="shrink-0 text-[var(--warm-400)]" />
            {job.customer_address}
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

      {/* Photos link */}
      {!isReadOnly && (
        <Link href={`/fitter/job/${id}/photos`}
          className="flex items-center gap-3 bg-white rounded-xl border border-[var(--warm-100)] p-4 hover:border-[var(--green-300)] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[var(--green-50)] flex items-center justify-center">
            <Camera size={20} className="text-[var(--green-600)]" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-[var(--warm-900)]">Photos & Videos</div>
            <div className="text-xs text-[var(--warm-500)]">
              {(job.photos_before?.length || 0) + (job.photos_after?.length || 0)} photos, {job.videos?.length || 0} videos
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--warm-300)]" />
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
        <div className="flex gap-3">
          <button onClick={saveChecklists} disabled={saving}
            className="flex-1 py-3 bg-white border border-[var(--warm-200)] text-[var(--warm-700)] text-sm font-medium rounded-xl hover:bg-[var(--warm-50)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Progress
          </button>
          {flow && (
            <button onClick={advanceStatus} disabled={advancing}
              className={`flex-1 py-3 ${flow.color} text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2`}>
              {advancing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {flow.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, { label: string; className: string }> = {
    assigned:    { label: 'Assigned',    className: 'bg-blue-100 text-blue-700' },
    accepted:    { label: 'Accepted',    className: 'bg-indigo-100 text-indigo-700' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
    completed:   { label: 'Completed',   className: 'bg-green-100 text-green-700' },
    signed_off:  { label: 'Signed Off',  className: 'bg-emerald-100 text-emerald-700' },
    approved:    { label: 'Approved',    className: 'bg-teal-100 text-teal-700' },
    rejected:    { label: 'Rejected',    className: 'bg-red-100 text-red-700' },
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
