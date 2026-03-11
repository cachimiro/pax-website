'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { Phone, Loader2, X } from 'lucide-react'
import { useUpdateLead, useCreateTask } from '@/lib/crm/hooks'
import { toast } from 'sonner'

const OUTCOMES = [
  { value: 'reached',    label: 'Reached' },
  { value: 'no_answer',  label: 'No answer' },
  { value: 'voicemail',  label: 'Left voicemail' },
  { value: 'wrong',      label: 'Wrong number' },
] as const

const NEXT_ACTIONS = [
  { value: 'follow_up',      label: 'Follow up call' },
  { value: 'send_quote',     label: 'Send quote' },
  { value: 'site_visit',     label: 'Schedule visit' },
  { value: 'send_contract',  label: 'Send contract' },
  { value: 'other',          label: 'No action needed' },
] as const

interface Props {
  leadId: string
  existingNotes: string | null
  primaryOppId: string | null
  onClose: () => void
}

export default function CallLogForm({ leadId, existingNotes, primaryOppId, onClose }: Props) {
  const updateLead = useUpdateLead()
  const createTask = useCreateTask()

  const [outcome, setOutcome] = useState('')
  const [duration, setDuration] = useState('')
  const [summary, setSummary] = useState('')
  const [nextAction, setNextAction] = useState<string>('follow_up')
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [autoTask, setAutoTask] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!outcome) { setError('Please select a call outcome.'); return }
    setError('')
    setSaving(true)

    try {
      // Append structured call log entry to notes
      const entry = `Call ${format(new Date(), 'dd MMM yyyy HH:mm')}: ${outcome}${duration ? ` (${duration}min)` : ''}${summary ? ` — ${summary}` : ''}`
      const newNotes = existingNotes ? `${existingNotes}\n${entry}` : entry
      await updateLead.mutateAsync({ id: leadId, notes: newNotes })

      // Optionally create a follow-up task
      if (autoTask && nextAction !== 'other') {
        await createTask.mutateAsync({
          type: nextAction,
          due_at: dueDate ? new Date(dueDate).toISOString() : null,
          opportunity_id: primaryOppId,
          lead_id: null,
        })
      }

      toast.success('Call logged')
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to log call')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 p-4 bg-[var(--warm-50)] border border-[var(--warm-100)] rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Phone size={12} className="text-[var(--warm-400)]" />
          <span className="text-xs font-semibold text-[var(--warm-700)]">Log Call</span>
        </div>
        <button onClick={onClose} className="p-0.5 text-[var(--warm-400)] hover:text-[var(--warm-600)]">
          <X size={13} />
        </button>
      </div>

      {/* Outcome */}
      <div>
        <p className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider mb-2">Outcome *</p>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map(o => (
            <button
              key={o.value}
              onClick={() => setOutcome(o.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                outcome === o.value
                  ? 'bg-[var(--green-600)] text-white border-[var(--green-600)]'
                  : 'bg-white text-[var(--warm-600)] border-[var(--warm-200)] hover:border-[var(--green-400)]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {error && <p className="mt-1.5 text-[10px] text-red-500">{error}</p>}
      </div>

      {/* Duration + Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Duration (min)</label>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="e.g. 15"
            className="mt-1 w-full px-2.5 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--green-400)] bg-white"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Next Action</label>
          <select
            value={nextAction}
            onChange={e => setNextAction(e.target.value)}
            className="mt-1 w-full px-2.5 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--green-400)] bg-white"
          >
            {NEXT_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Summary</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={2}
          placeholder="What was discussed…"
          className="mt-1 w-full px-2.5 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--green-400)] bg-white resize-none"
        />
      </div>

      {/* Auto-task */}
      {nextAction !== 'other' && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoTask}
              onChange={e => setAutoTask(e.target.checked)}
              className="accent-[var(--green-600)]"
            />
            <span className="text-xs text-[var(--warm-600)]">Create task</span>
          </label>
          {autoTask && (
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="text-xs border border-[var(--warm-200)] rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--green-400)] bg-white"
            />
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--green-600)] text-white rounded-xl hover:bg-[var(--green-700)] disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 size={11} className="animate-spin" />}
          Save Call Log
        </button>
      </div>
    </div>
  )
}
