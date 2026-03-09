'use client'

import { AlertTriangle, Info, Sparkles, Loader2 } from 'lucide-react'
import ObstacleRow from './ObstacleRow'
import SectionShell from './SectionShell'
import type { GuideState, FinishType, ObstacleState, PackageChoice } from './types'
import {
  SPACE_CONSTRAINT_OPTIONS,
  FINISH_TYPE_OPTIONS,
  NEXT_ACTION_OPTIONS,
} from './types'

// ─── Shared chip toggle ───────────────────────────────────────────────────────

function ChipToggle({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
        selected
          ? 'bg-[var(--green-700)] text-white border-[var(--green-700)]'
          : 'bg-white text-[var(--warm-600)] border-[var(--warm-200)] hover:border-[var(--warm-300)]'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Section 1: Space ─────────────────────────────────────────────────────────

export function Section1Space({
  state, onChange,
}: { state: GuideState; onChange: (patch: Partial<GuideState>) => void }) {
  const complete = !!state.room_confirmed

  const toggleConstraint = (id: string) => {
    if (id === 'none') { onChange({ space_constraints: ['none'] }); return }
    const prev = state.space_constraints.filter((c) => c !== 'none')
    onChange({
      space_constraints: prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    })
  }

  return (
    <SectionShell number={1} title="Identify the space" complete={complete} defaultOpen>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-[var(--warm-600)] block mb-1">
            Which room / wall?
          </label>
          <input
            type="text"
            value={state.room_confirmed}
            onChange={(e) => onChange({ room_confirmed: e.target.value })}
            placeholder="e.g. Master bedroom, left wall"
            className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--warm-600)] block mb-1.5">
            Space constraints
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SPACE_CONSTRAINT_OPTIONS.map((opt) => (
              <ChipToggle
                key={opt.id}
                label={opt.label}
                selected={state.space_constraints.includes(opt.id)}
                onClick={() => toggleConstraint(opt.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.photos_on_file}
              onChange={(e) => onChange({ photos_on_file: e.target.checked })}
              className="w-4 h-4 rounded accent-green-700"
            />
            <span className="text-xs text-[var(--warm-700)]">Photos already on file</span>
          </label>
        </div>

        {!state.photos_on_file && (
          <input
            type="text"
            value={state.photos_note}
            onChange={(e) => onChange({ photos_note: e.target.value })}
            placeholder="Note: customer to send photos after call"
            className="w-full px-3 py-2 text-xs border border-amber-200 rounded-xl bg-amber-50 text-amber-800 focus:outline-none focus:border-amber-400"
          />
        )}
      </div>
    </SectionShell>
  )
}

// ─── Section 2: Package ───────────────────────────────────────────────────────

export function Section2Package({
  state, onChange,
}: { state: GuideState; onChange: (patch: Partial<GuideState>) => void }) {
  const complete = !!state.package_confirmed

  const packages: { id: PackageChoice; label: string; color: string }[] = [
    { id: 'budget',     label: 'Budget',     color: 'border-orange-400 bg-orange-50 text-orange-700' },
    { id: 'paxbespoke', label: 'PaxBespoke', color: 'border-[var(--green-600)] bg-[var(--green-50)] text-[var(--green-700)]' },
    { id: 'select',     label: 'Select',     color: 'border-amber-500 bg-amber-50 text-amber-700' },
  ]

  return (
    <SectionShell number={2} title="Confirm package" complete={complete}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => {
                const next = state.package_confirmed === pkg.id ? '' : pkg.id
                const nextAction = next ? NEXT_ACTION_OPTIONS[next] : ''
                onChange({ package_confirmed: next as PackageChoice | '', next_action: nextAction })
              }}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                state.package_confirmed === pkg.id
                  ? pkg.color
                  : 'border-[var(--warm-100)] bg-white text-[var(--warm-500)] hover:border-[var(--warm-200)]'
              }`}
            >
              {pkg.label}
            </button>
          ))}
        </div>

        {state.package_confirmed === 'budget' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Explain to customer:</span> They are responsible for accurate measurements and identifying obstacles. Errors can affect the final installation.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.budget_responsibility_confirmed}
                onChange={(e) => onChange({ budget_responsibility_confirmed: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <span className="text-xs font-medium text-amber-800">Customer confirmed ✓</span>
            </label>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

// ─── Section 3: Obstacles ─────────────────────────────────────────────────────

export function Section3Obstacles({
  state, onChange,
}: { state: GuideState; onChange: (patch: Partial<GuideState>) => void }) {
  const allAnswered = [
    state.obstacle_bed, state.obstacle_radiator, state.obstacle_curtain_rail,
    state.obstacle_coving, state.obstacle_picture_rail,
  ].every((v) => v !== 'unknown')

  const obstacles: { key: keyof GuideState; label: string; hint: string }[] = [
    { key: 'obstacle_bed',          label: 'Bed',          hint: 'May block door opening' },
    { key: 'obstacle_radiator',     label: 'Radiator',     hint: 'May block door opening' },
    { key: 'obstacle_curtain_rail', label: 'Curtain rail', hint: 'May block door opening' },
    { key: 'obstacle_coving',       label: 'Coving',       hint: 'May affect clearance' },
    { key: 'obstacle_picture_rail', label: 'Picture rail', hint: 'May affect clearance' },
  ]

  return (
    <SectionShell number={3} title="Obstacles checklist" complete={allAnswered}>
      <div className="space-y-0">
        {obstacles.map((obs) => (
          <ObstacleRow
            key={obs.key}
            label={obs.label}
            hint={obs.hint}
            value={state[obs.key] as ObstacleState}
            onChange={(v) => onChange({ [obs.key]: v })}
          />
        ))}
        <div className="pt-2">
          <label className="text-xs font-medium text-[var(--warm-600)] block mb-1">Other obstacle</label>
          <input
            type="text"
            value={state.obstacle_other}
            onChange={(e) => onChange({ obstacle_other: e.target.value })}
            placeholder="Describe any other obstacle..."
            className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
          />
        </div>
      </div>
    </SectionShell>
  )
}

// ─── Section 4: Finish details ────────────────────────────────────────────────

export function Section4Finish({
  state, onChange, finishHint,
}: {
  state: GuideState
  onChange: (patch: Partial<GuideState>) => void
  finishHint: { finish_type: FinishType; reason: string } | null
}) {
  const isBudget = state.package_confirmed === 'budget'
  if (isBudget) return null

  const complete = !!state.finish_type
  const fd = state.finish_details

  return (
    <SectionShell number={4} title="Finish details" complete={complete}>
      <div className="space-y-3">
        {finishHint && !state.finish_type && (
          <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-xl p-3">
            <Sparkles size={13} className="text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-purple-700">AI suggestion</p>
              <p className="text-xs text-purple-600 mt-0.5">
                <span className="font-semibold capitalize">{finishHint.finish_type.replace('_', ' ')}</span> — {finishHint.reason}
              </p>
              <button
                onClick={() => onChange({ finish_type: finishHint.finish_type })}
                className="mt-1.5 text-xs text-purple-700 underline font-medium"
              >
                Use this suggestion
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {FINISH_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChange({ finish_type: opt.id, finish_details: {} })}
              className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                state.finish_type === opt.id
                  ? 'border-[var(--green-600)] bg-[var(--green-50)]'
                  : 'border-[var(--warm-100)] bg-white hover:border-[var(--warm-200)]'
              }`}
            >
              <p className={`text-xs font-semibold ${state.finish_type === opt.id ? 'text-[var(--green-700)]' : 'text-[var(--warm-700)]'}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-[var(--warm-400)] mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Skirting Board sub-fields */}
        {state.finish_type === 'skirting_board' && (
          <div className="space-y-2 pt-1">
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)] block mb-1">Skirting height (mm)</label>
              <input
                type="number"
                value={fd.height_mm ?? ''}
                onChange={(e) => onChange({ finish_details: { ...fd, height_mm: Number(e.target.value) || undefined } })}
                placeholder="e.g. 120"
                className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fd.photos_received ?? false}
                onChange={(e) => onChange({ finish_details: { ...fd, photos_received: e.target.checked } })}
                className="w-4 h-4 rounded accent-green-700"
              />
              <span className="text-xs text-[var(--warm-700)]">Photos of existing skirting received</span>
            </label>
          </div>
        )}

        {/* Flush Fit sub-fields */}
        {state.finish_type === 'flush_fit' && (
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fd.gap_noted ?? false}
                onChange={(e) => onChange({ finish_details: { ...fd, gap_noted: e.target.checked } })}
                className="w-4 h-4 rounded accent-green-700"
              />
              <span className="text-xs text-[var(--warm-700)]">Gap tolerance noted</span>
            </label>
            <input
              type="text"
              value={fd.notes ?? ''}
              onChange={(e) => onChange({ finish_details: { ...fd, notes: e.target.value } })}
              placeholder="Additional flush fit notes..."
              className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
            />
          </div>
        )}

        {/* Cornice sub-fields */}
        {state.finish_type === 'cornice' && (
          <div className="space-y-2 pt-1">
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)] block mb-1">Cornice height (mm)</label>
              <input
                type="number"
                value={fd.cornice_height_mm ?? ''}
                onChange={(e) => onChange({ finish_details: { ...fd, cornice_height_mm: Number(e.target.value) || undefined } })}
                placeholder="e.g. 80"
                className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fd.photos_received ?? false}
                onChange={(e) => onChange({ finish_details: { ...fd, photos_received: e.target.checked } })}
                className="w-4 h-4 rounded accent-green-700"
              />
              <span className="text-xs text-[var(--warm-700)]">Photos of cornice received</span>
            </label>
          </div>
        )}

        {/* Other */}
        {state.finish_type === 'other' && (
          <input
            type="text"
            value={fd.notes ?? ''}
            onChange={(e) => onChange({ finish_details: { ...fd, notes: e.target.value } })}
            placeholder="Describe the finish..."
            className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
          />
        )}
      </div>
    </SectionShell>
  )
}

// ─── Section 5: Notes ─────────────────────────────────────────────────────────

export function Section5Notes({
  state, onChange, onSummarise, summarising,
}: {
  state: GuideState
  onChange: (patch: Partial<GuideState>) => void
  onSummarise: () => void
  summarising: boolean
}) {
  const complete = !!state.call_notes.trim()

  return (
    <SectionShell number={5} title="Call notes & next action" complete={complete}>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-[var(--warm-600)]">Call notes</label>
            <button
              onClick={onSummarise}
              disabled={summarising}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50 transition-colors"
            >
              {summarising
                ? <Loader2 size={11} className="animate-spin" />
                : <Sparkles size={11} />}
              AI summarise
            </button>
          </div>
          <textarea
            value={state.call_notes}
            onChange={(e) => onChange({ call_notes: e.target.value })}
            rows={4}
            placeholder="Key points discussed, customer reactions, anything to note..."
            className="w-full px-3 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-none bg-white"
          />
          <p className="text-[10px] text-[var(--warm-400)] mt-1 flex items-center gap-1">
            <Info size={10} />
            AI summarise condenses all guide data into a clean paragraph you can edit before completing.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--warm-600)] block mb-1">Next action</label>
          <input
            type="text"
            value={state.next_action}
            onChange={(e) => onChange({ next_action: e.target.value })}
            placeholder="e.g. Create 3D design"
            className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
          />
        </div>
      </div>
    </SectionShell>
  )
}
