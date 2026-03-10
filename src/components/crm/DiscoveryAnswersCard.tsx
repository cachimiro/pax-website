'use client'

import {
  ClipboardList, Home, Layers, Wrench, AlertTriangle,
  CheckCircle2, HelpCircle, XCircle, FileText, ChevronDown, ChevronUp,
  Edit3, Check, Loader2,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import type { Meet1Notes, ObstacleState, FinishType } from '@/lib/crm/types'
import { useSaveMeet1Notes } from '@/lib/crm/hooks'

interface DiscoveryAnswersCardProps {
  meet1Notes: Meet1Notes | null | undefined
  isLoading?: boolean
  opportunityId?: string | null
}

const OBSTACLE_KEYS: { key: keyof Meet1Notes; label: string }[] = [
  { key: 'obstacle_bed',          label: 'Bed' },
  { key: 'obstacle_radiator',     label: 'Radiator' },
  { key: 'obstacle_curtain_rail', label: 'Curtain rail' },
  { key: 'obstacle_coving',       label: 'Coving' },
  { key: 'obstacle_picture_rail', label: 'Picture rail' },
]

const FINISH_LABELS: Record<string, string> = {
  skirting_board: 'Skirting board',
  flush_fit:      'Flush fit',
  cornice:        'Cornice',
  other:          'Other',
}

const PACKAGE_LABELS: Record<string, string> = {
  budget:     'Budget',
  paxbespoke: 'PaxBespoke',
  select:     'Select',
}

const SPACE_CONSTRAINT_OPTIONS = [
  'low_ceiling', 'sloped_ceiling', 'chimney_breast', 'alcove',
  'radiator', 'window', 'door_swing', 'other',
]

function ObstacleIcon({ state }: { state: ObstacleState }) {
  if (state === 'present')     return <CheckCircle2 size={11} className="text-amber-500 shrink-0" />
  if (state === 'not_present') return <XCircle size={11} className="text-[var(--warm-300)] shrink-0" />
  return <HelpCircle size={11} className="text-[var(--warm-300)] shrink-0" />
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-[var(--warm-300)] mt-0.5 shrink-0">{icon}</span>
      <span className="text-[10px] font-medium text-[var(--warm-400)] w-24 shrink-0">{label}</span>
      <span className="text-xs text-[var(--warm-700)] flex-1">{value}</span>
    </div>
  )
}

function EditForm({
  initial,
  opportunityId,
  onDone,
}: {
  initial: Partial<Meet1Notes>
  opportunityId: string
  onDone: () => void
}) {
  const save = useSaveMeet1Notes(opportunityId)
  const [draft, setDraft] = useState<Partial<Meet1Notes>>({ ...initial })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function patch(updates: Partial<Meet1Notes>) {
    const next = { ...draft, ...updates }
    setDraft(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save.mutate(updates, { onError: () => toast.error('Failed to save') })
    }, 600)
  }

  function toggleConstraint(val: string) {
    const current = draft.space_constraints ?? []
    patch({
      space_constraints: current.includes(val)
        ? current.filter(c => c !== val)
        : [...current, val],
    })
  }

  function cycleObstacle(key: keyof Meet1Notes) {
    const current = (draft[key] as ObstacleState) ?? 'unknown'
    const next: ObstacleState =
      current === 'unknown' ? 'present' :
      current === 'present' ? 'not_present' : 'unknown'
    patch({ [key]: next } as Partial<Meet1Notes>)
  }

  async function handleSaveAndClose() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    try {
      await save.mutateAsync(draft)
      onDone()
    } catch {
      toast.error('Failed to save')
    }
  }

  return (
    <div className="px-4 pb-4 border-t border-[var(--warm-50)] space-y-5 pt-4">

      {/* Section 1: Space */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider flex items-center gap-1.5">
          <Home size={10} /> Space
        </p>
        <div>
          <label className="text-[11px] text-[var(--warm-500)] mb-1 block">Room</label>
          <input
            value={draft.room_confirmed ?? ''}
            onChange={e => patch({ room_confirmed: e.target.value })}
            placeholder="e.g. Master bedroom"
            className="w-full text-sm border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div>
          <label className="text-[11px] text-[var(--warm-500)] mb-1.5 block">Space constraints</label>
          <div className="flex flex-wrap gap-1.5">
            {SPACE_CONSTRAINT_OPTIONS.map(opt => {
              const active = (draft.space_constraints ?? []).includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => toggleConstraint(opt)}
                  className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                    active
                      ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
                      : 'border-[var(--warm-200)] text-[var(--warm-500)] hover:border-[var(--warm-300)]'
                  }`}
                >
                  {opt.replace(/_/g, ' ')}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => patch({ photos_on_file: !draft.photos_on_file })}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              draft.photos_on_file ? 'bg-[var(--brand)] border-[var(--brand)]' : 'border-[var(--warm-300)]'
            }`}
          >
            {draft.photos_on_file && <Check size={10} className="text-white" />}
          </button>
          <span className="text-xs text-[var(--warm-600)]">Photos on file</span>
        </div>
        {draft.photos_on_file && (
          <input
            value={draft.photos_note ?? ''}
            onChange={e => patch({ photos_note: e.target.value })}
            placeholder="Photo notes…"
            className="w-full text-sm border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--brand)]"
          />
        )}
      </section>

      {/* Section 2: Package */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={10} /> Package
        </p>
        <div className="flex gap-2">
          {(['budget', 'paxbespoke', 'select'] as const).map(pkg => (
            <button
              key={pkg}
              onClick={() => patch({ package_confirmed: pkg })}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                draft.package_confirmed === pkg
                  ? 'bg-[var(--brand)] border-[var(--brand)] text-white font-medium'
                  : 'border-[var(--warm-200)] text-[var(--warm-500)] hover:border-[var(--warm-300)]'
              }`}
            >
              {PACKAGE_LABELS[pkg]}
            </button>
          ))}
        </div>
        {draft.package_confirmed === 'budget' && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => patch({ budget_responsibility_confirmed: !draft.budget_responsibility_confirmed })}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                draft.budget_responsibility_confirmed ? 'bg-[var(--brand)] border-[var(--brand)]' : 'border-[var(--warm-300)]'
              }`}
            >
              {draft.budget_responsibility_confirmed && <Check size={10} className="text-white" />}
            </button>
            <span className="text-xs text-[var(--warm-600)]">Customer confirmed they own measurements</span>
          </div>
        )}
      </section>

      {/* Section 3: Obstacles */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle size={10} /> Obstacles
        </p>
        <p className="text-[10px] text-[var(--warm-400)]">Tap to cycle: unknown → present → clear</p>
        <div className="space-y-1">
          {OBSTACLE_KEYS.map(({ key, label }) => {
            const state = (draft[key] as ObstacleState) ?? 'unknown'
            return (
              <button
                key={key}
                onClick={() => cycleObstacle(key)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--warm-100)] hover:bg-[var(--warm-25)] transition-colors text-left"
              >
                <ObstacleIcon state={state} />
                <span className="text-xs text-[var(--warm-700)] flex-1">{label}</span>
                <span className={`text-[10px] ${
                  state === 'present' ? 'text-amber-600' :
                  state === 'not_present' ? 'text-[var(--warm-300)]' : 'text-[var(--warm-400)]'
                }`}>
                  {state === 'present' ? 'Present' : state === 'not_present' ? 'Clear' : 'Unknown'}
                </span>
              </button>
            )
          })}
        </div>
        <input
          value={draft.obstacle_other ?? ''}
          onChange={e => patch({ obstacle_other: e.target.value })}
          placeholder="Other obstacle…"
          className="w-full text-sm border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--brand)]"
        />
      </section>

      {/* Section 4: Finish */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider flex items-center gap-1.5">
          <Wrench size={10} /> Finish
        </p>
        <div className="flex gap-2 flex-wrap">
          {(['skirting_board', 'flush_fit', 'cornice', 'other'] as FinishType[]).map(ft => (
            <button
              key={ft}
              onClick={() => patch({ finish_type: ft })}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                draft.finish_type === ft
                  ? 'bg-[var(--brand)] border-[var(--brand)] text-white font-medium'
                  : 'border-[var(--warm-200)] text-[var(--warm-500)] hover:border-[var(--warm-300)]'
              }`}
            >
              {FINISH_LABELS[ft]}
            </button>
          ))}
        </div>
      </section>

      {/* Section 5: Notes */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={10} /> Call notes
        </p>
        <textarea
          value={draft.call_notes ?? ''}
          onChange={e => patch({ call_notes: e.target.value })}
          placeholder="Notes from the call…"
          rows={3}
          className="w-full text-sm border border-[var(--warm-200)] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--brand)] resize-none"
        />
        <input
          value={draft.next_action ?? ''}
          onChange={e => patch({ next_action: e.target.value })}
          placeholder="Next action…"
          className="w-full text-sm border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--brand)]"
        />
      </section>

      <button
        onClick={handleSaveAndClose}
        disabled={save.isPending}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-[var(--brand)] text-white text-xs font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {save.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        Save & close
      </button>
    </div>
  )
}

function ReadView({ notes }: { notes: Meet1Notes }) {
  return (
    <div className="px-4 pb-4 border-t border-[var(--warm-50)] divide-y divide-[var(--warm-50)]">
      {notes.room_confirmed && (
        <Row icon={<Home size={11} />} label="Room" value={notes.room_confirmed} />
      )}
      {notes.package_confirmed && (
        <Row icon={<Layers size={11} />} label="Package" value={PACKAGE_LABELS[notes.package_confirmed] ?? notes.package_confirmed} />
      )}
      {notes.space_constraints && notes.space_constraints.length > 0 && (
        <Row
          icon={<AlertTriangle size={11} />}
          label="Constraints"
          value={
            <div className="flex flex-wrap gap-1">
              {notes.space_constraints.map(c => (
                <span key={c} className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded">
                  {c.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          }
        />
      )}
      {notes.finish_type && (
        <Row icon={<Wrench size={11} />} label="Finish" value={FINISH_LABELS[notes.finish_type] ?? notes.finish_type} />
      )}
      {(() => {
        const present = OBSTACLE_KEYS.filter(o => notes[o.key] === 'present')
        const unknown = OBSTACLE_KEYS.filter(o => notes[o.key] === 'unknown')
        if (present.length === 0 && unknown.length === 0) return null
        return (
          <Row
            icon={<AlertTriangle size={11} />}
            label="Obstacles"
            value={
              <div className="space-y-0.5">
                {present.map(o => (
                  <div key={o.key} className="flex items-center gap-1">
                    <ObstacleIcon state="present" />
                    <span className="text-[11px] text-amber-700">{o.label}</span>
                  </div>
                ))}
                {unknown.map(o => (
                  <div key={o.key} className="flex items-center gap-1">
                    <ObstacleIcon state="unknown" />
                    <span className="text-[11px] text-[var(--warm-400)]">{o.label} (TBC)</span>
                  </div>
                ))}
                {notes.obstacle_other && (
                  <div className="flex items-center gap-1">
                    <ObstacleIcon state="present" />
                    <span className="text-[11px] text-amber-700">{notes.obstacle_other}</span>
                  </div>
                )}
              </div>
            }
          />
        )
      })()}
      {notes.call_notes && (
        <Row icon={<FileText size={11} />} label="Notes" value={<span className="whitespace-pre-wrap">{notes.call_notes}</span>} />
      )}
    </div>
  )
}

export default function DiscoveryAnswersCard({ meet1Notes, isLoading, opportunityId }: DiscoveryAnswersCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  if (isLoading) return null

  const hasData = !!(meet1Notes && (
    meet1Notes.room_confirmed ||
    meet1Notes.package_confirmed ||
    meet1Notes.call_notes ||
    (meet1Notes.space_constraints?.length ?? 0) > 0
  ))

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center">
        <button
          onClick={() => { setExpanded(e => !e); if (expanded) setEditing(false) }}
          className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-[var(--warm-50)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={13} className="text-[var(--warm-400)]" />
            <span className="text-[11px] font-semibold text-[var(--warm-600)]">Meet 1 answers</span>
            {meet1Notes?.completed && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Completed</span>
            )}
            {!hasData && !meet1Notes?.completed && (
              <span className="text-[9px] text-[var(--warm-400)]">No answers yet</span>
            )}
          </div>
          {expanded ? <ChevronUp size={13} className="text-[var(--warm-300)]" /> : <ChevronDown size={13} className="text-[var(--warm-300)]" />}
        </button>

        {expanded && opportunityId && (
          <button
            onClick={() => setEditing(e => !e)}
            className={`px-3 py-3 transition-colors ${editing ? 'text-[var(--brand)]' : 'text-[var(--warm-400)] hover:text-[var(--warm-600)]'}`}
            title={editing ? 'Back to read view' : 'Edit answers'}
          >
            <Edit3 size={13} />
          </button>
        )}
      </div>

      {expanded && (
        editing && opportunityId ? (
          <EditForm initial={meet1Notes ?? {}} opportunityId={opportunityId} onDone={() => setEditing(false)} />
        ) : hasData ? (
          <ReadView notes={meet1Notes!} />
        ) : (
          <div className="px-4 pb-4 border-t border-[var(--warm-50)]">
            <p className="text-xs text-[var(--warm-400)] py-3 text-center">
              No answers yet.{opportunityId ? ' Click ✎ to fill them in.' : ''}
            </p>
          </div>
        )
      )}
    </div>
  )
}
