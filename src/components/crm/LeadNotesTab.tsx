'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Save, Loader2, FileText, Phone, Ruler, MapPin, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useLeadNotes, useAddLeadNote, useUpdateLeadNote } from '@/lib/crm/hooks'
import type { LeadNote } from '@/lib/crm/types'

type Section = 'general' | 'call' | 'design' | 'site_visit' | 'objections'

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'general',    label: 'General',    icon: <FileText size={12} /> },
  { key: 'call',       label: 'Call Notes', icon: <Phone size={12} /> },
  { key: 'design',     label: 'Design',     icon: <Ruler size={12} /> },
  { key: 'site_visit', label: 'Site Visit', icon: <MapPin size={12} /> },
  { key: 'objections', label: 'Objections', icon: <AlertTriangle size={12} /> },
]

interface LeadNotesTabProps {
  leadId: string
  existingNotes: string | null  // legacy lead.notes blob — pre-fills General if no DB notes
}

export default function LeadNotesTab({ leadId, existingNotes }: LeadNotesTabProps) {
  const [activeSection, setActiveSection] = useState<Section>('general')
  const { data: allNotes = [], isLoading } = useLeadNotes(leadId)
  const addNote = useAddLeadNote()
  const updateNote = useUpdateLeadNote()

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex gap-1 px-4 pt-4 pb-0 overflow-x-auto">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeSection === s.key
                ? 'text-[var(--brand)] border-[var(--brand)] bg-white'
                : 'text-[var(--warm-500)] border-transparent hover:text-[var(--warm-700)]'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto border-t border-[var(--warm-100)]">
        <SectionPanel
          key={activeSection}
          leadId={leadId}
          section={activeSection}
          notes={allNotes.filter(n => n.section === activeSection)}
          isLoading={isLoading}
          legacyContent={activeSection === 'general' ? existingNotes : null}
          onAdd={(body) => addNote.mutateAsync({ lead_id: leadId, section: activeSection, body })}
          onUpdate={(noteId, body) => updateNote.mutateAsync({ lead_id: leadId, note_id: noteId, body })}
          isSaving={addNote.isPending || updateNote.isPending}
        />
      </div>
    </div>
  )
}

interface SectionPanelProps {
  leadId: string
  section: Section
  notes: LeadNote[]
  isLoading: boolean
  legacyContent: string | null
  onAdd: (body: string) => Promise<LeadNote>
  onUpdate: (noteId: string, body: string) => Promise<LeadNote>
  isSaving: boolean
}

function SectionPanel({ notes, isLoading, legacyContent, onAdd, isSaving }: SectionPanelProps) {
  // Most recent note is the "editable block"
  const latestNote = notes[0] ?? null
  const logNotes = notes.slice(1)

  // Determine initial value: latest DB note, or legacy blob for general, or empty
  const initialValue = latestNote?.body ?? legacyContent ?? ''
  const [draft, setDraft] = useState(initialValue)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestNoteRef = useRef(latestNote)
  latestNoteRef.current = latestNote

  // Sync draft when notes load
  useEffect(() => {
    if (!isLoading) {
      setDraft(latestNote?.body ?? legacyContent ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  const triggerAutoSave = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus('saving')
    debounceRef.current = setTimeout(async () => {
      if (!value.trim()) { setSaveStatus('idle'); return }
      try {
        if (latestNoteRef.current) {
          // Update existing latest note
          await fetch(`/api/crm/leads/${latestNoteRef.current.lead_id}/notes/${latestNoteRef.current.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: value.trim() }),
          })
        } else {
          // No note yet — create one
          await onAdd(value.trim())
        }
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
        toast.error('Failed to save note')
      }
    }, 800)
  }, [onAdd])

  async function handleAddEntry() {
    if (!draft.trim()) return
    try {
      await onAdd(draft.trim())
      toast.success('Entry added to log')
    } catch {
      // error handled in hook
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={16} className="animate-spin text-[var(--warm-300)]" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Editable block */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider">Current notes</span>
          <span className={`text-[10px] transition-all ${
            saveStatus === 'saving' ? 'text-amber-500' :
            saveStatus === 'saved'  ? 'text-emerald-600' :
            'text-transparent'
          }`}>
            {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
          </span>
        </div>
        <textarea
          value={draft}
          onChange={e => { setDraft(e.target.value); triggerAutoSave(e.target.value) }}
          placeholder="Start typing — auto-saves as you go…"
          rows={5}
          className="w-full px-3 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--brand)] focus:outline-none resize-none bg-white leading-relaxed"
        />
        <button
          onClick={handleAddEntry}
          disabled={!draft.trim() || isSaving}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:opacity-80 disabled:opacity-40 transition-opacity"
        >
          {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Add as log entry
        </button>
      </div>

      {/* Log entries */}
      {logNotes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--warm-50)]">
          <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider">History</p>
          {logNotes.map(note => (
            <LogEntry key={note.id} note={note} />
          ))}
        </div>
      )}

      {notes.length === 0 && !draft && (
        <p className="text-xs text-[var(--warm-400)] text-center py-4">No notes yet. Start typing above.</p>
      )}
    </div>
  )
}

function LogEntry({ note }: { note: LeadNote }) {
  const initials = note.author?.full_name
    ? note.author.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="flex gap-2.5 py-2 border-b border-[var(--warm-50)] last:border-0">
      <div className="w-6 h-6 rounded-full bg-[var(--warm-100)] flex items-center justify-center text-[9px] font-bold text-[var(--warm-500)] shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-medium text-[var(--warm-700)]">
            {note.author?.full_name ?? 'Unknown'}
          </span>
          <span className="text-[10px] text-[var(--warm-400)]">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-[var(--warm-700)] whitespace-pre-wrap leading-relaxed">{note.body}</p>
      </div>
    </div>
  )
}
