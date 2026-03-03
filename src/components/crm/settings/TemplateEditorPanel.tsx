'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Trash2, Mail, Loader2, ChevronDown, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateTemplate, useDeleteTemplate, useCreateTemplate } from '@/lib/crm/hooks'
import type { MessageTemplate, MessageChannel, DelayRule } from '@/lib/crm/types'
import {
  CHANNEL_OPTIONS, DELAY_LABELS, DELAY_HELP, TEMPLATE_VARIABLES,
  STAGE_OPTIONS, toggleChannel,
} from './template-constants'

interface TemplateEditorPanelProps {
  template: MessageTemplate | null
  isNew?: boolean
  onClose: () => void
}

export default function TemplateEditorPanel({ template, isNew, onClose }: TemplateEditorPanelProps) {
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const createTemplate = useCreateTemplate()

  const [form, setForm] = useState({
    name: '', slug: '', subject: '', body: '',
    channels: ['email'] as MessageChannel[],
    trigger_stage: '' as string | null,
    delay_rule: 'immediate' as DelayRule,
    delay_minutes: 0,
    active: true,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showVars, setShowVars] = useState(false)
  const [testChannel, setTestChannel] = useState<MessageChannel | null>(null)
  const [testTo, setTestTo] = useState('')
  const [testSending, setTestSending] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Populate form when template changes
  useEffect(() => {
    if (template && !isNew) {
      setForm({
        name: template.name,
        slug: template.slug,
        subject: template.subject,
        body: template.body,
        channels: [...template.channels],
        trigger_stage: template.trigger_stage ?? '',
        delay_rule: template.delay_rule ?? 'immediate',
        delay_minutes: template.delay_minutes ?? 0,
        active: template.active,
      })
    } else if (isNew) {
      setForm({
        name: '', slug: '', subject: '', body: '',
        channels: ['email'], trigger_stage: '',
        delay_rule: 'immediate', delay_minutes: 0, active: true,
      })
    }
    setConfirmDelete(false)
    setShowVars(false)
  }, [template, isNew])

  function insertVariable(key: string) {
    const ta = bodyRef.current
    if (!ta) {
      setForm(f => ({ ...f, body: f.body + `{{${key}}}` }))
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = form.body
    const insert = `{{${key}}}`
    setForm(f => ({ ...f, body: text.slice(0, start) + insert + text.slice(end) }))
    // Restore cursor after React re-render
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + insert.length, start + insert.length)
    }, 0)
  }

  async function handleSave() {
    if (!form.name) { toast.error('Name is required'); return }
    if (isNew) {
      if (!form.slug) { toast.error('Slug is required'); return }
      try {
        await createTemplate.mutateAsync({
          name: form.name, slug: form.slug, subject: form.subject, body: form.body,
          channels: form.channels, trigger_stage: form.trigger_stage || null,
          delay_rule: form.delay_rule, delay_minutes: form.delay_minutes,
        })
        toast.success('Template created')
        onClose()
      } catch (err: any) { toast.error(err.message) }
    } else if (template) {
      try {
        await updateTemplate.mutateAsync({
          id: template.id, name: form.name, subject: form.subject, body: form.body,
          channels: form.channels, trigger_stage: form.trigger_stage || null,
          delay_rule: form.delay_rule, delay_minutes: form.delay_minutes,
          active: form.active,
        })
        toast.success('Template saved')
        onClose()
      } catch (err: any) { toast.error(err.message) }
    }
  }

  async function handleDelete() {
    if (!template) return
    try {
      await deleteTemplate.mutateAsync(template.id)
      toast.success('Template deleted')
      onClose()
    } catch (err: any) { toast.error(err.message) }
  }

  async function handleSendTest() {
    if (!testChannel || !testTo) { toast.error('Select channel and enter recipient'); return }
    setTestSending(true)
    try {
      const res = await fetch('/api/crm/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: form.subject, body: form.body, channel: testChannel, to: testTo }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.detail ?? `Test sent via ${data.sentVia ?? testChannel}`, { duration: 6000 })
        setTestChannel(null); setTestTo('')
      } else {
        toast.error(data.error ?? 'Send failed', { duration: 8000 })
      }
    } catch { toast.error('Send failed') }
    finally { setTestSending(false) }
  }

  const previewBody = form.body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = TEMPLATE_VARIABLES.find(tv => tv.key === key)
    return v?.example ?? `[${key}]`
  })

  const saving = updateTemplate.isPending || createTemplate.isPending

  return (
    <AnimatePresence>
      {(template || isNew) && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--warm-100)] shrink-0">
              <div>
                <h2 className="font-heading text-base font-semibold text-[var(--warm-900)]">
                  {isNew ? 'New Template' : 'Edit Template'}
                </h2>
                {!isNew && template && (
                  <p className="text-[10px] font-mono text-[var(--warm-400)] mt-0.5">{template.slug}</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[var(--warm-50)] rounded-lg transition-colors">
                <X size={16} className="text-[var(--warm-400)]" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Name + Slug */}
              <div className={isNew ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider font-medium">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Follow-up Nudge"
                    className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                </div>
                {isNew && (
                  <div>
                    <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider font-medium">Slug (unique ID)</label>
                    <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                      placeholder="e.g. followup_nudge"
                      className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none font-mono" />
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider font-medium">Subject</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject line"
                  className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
              </div>

              {/* Body + Variable inserter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider font-medium">Body</label>
                  <button onClick={() => setShowVars(!showVars)}
                    className="flex items-center gap-1 text-[10px] font-medium text-[var(--green-600)] hover:text-[var(--green-700)] transition-colors">
                    <ChevronDown size={10} className={`transition-transform ${showVars ? 'rotate-180' : ''}`} />
                    Insert Variable
                  </button>
                </div>

                {/* Variable popover */}
                <AnimatePresence>
                  {showVars && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-1 p-2 mb-2 bg-[var(--green-50)] rounded-xl border border-[var(--green-100)]">
                        {TEMPLATE_VARIABLES.map(v => (
                          <button key={v.key} onClick={() => insertVariable(v.key)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/80 transition-colors text-left group">
                            <code className="text-[9px] font-mono bg-white px-1 py-0.5 rounded border border-[var(--green-100)] text-[var(--green-700)] shrink-0">
                              {v.key}
                            </code>
                            <span className="text-[9px] text-[var(--warm-500)] truncate">{v.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <textarea ref={bodyRef} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={10} placeholder="Message body with {{placeholders}}"
                  className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-y font-mono leading-relaxed" />

                {/* Live preview */}
                {form.body && (
                  <div className="mt-2 p-3 rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)]">
                    <p className="text-[9px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-1.5">Preview</p>
                    <p className="text-xs text-[var(--warm-700)] whitespace-pre-wrap leading-relaxed">{previewBody}</p>
                  </div>
                )}
              </div>

              {/* Channels */}
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1.5 uppercase tracking-wider font-medium">Channels</label>
                <div className="flex gap-2">
                  {CHANNEL_OPTIONS.map(ch => (
                    <button key={ch.value} onClick={() => setForm(f => ({ ...f, channels: toggleChannel(f.channels, ch.value) }))}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        form.channels.includes(ch.value)
                          ? 'bg-[var(--green-50)] text-[var(--green-700)] ring-1 ring-[var(--green-200)]'
                          : 'bg-[var(--warm-50)] text-[var(--warm-400)] ring-1 ring-[var(--warm-100)]'
                      }`}>
                      {ch.icon} {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger + Timing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider font-medium">Trigger Stage</label>
                  <select value={form.trigger_stage ?? ''} onChange={e => setForm(f => ({ ...f, trigger_stage: e.target.value || null }))}
                    className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                    {STAGE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider font-medium">Timing</label>
                  <select value={form.delay_rule} onChange={e => setForm(f => ({ ...f, delay_rule: e.target.value as DelayRule }))}
                    className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                    {Object.entries(DELAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              {form.delay_rule !== 'immediate' && (
                <div className="max-w-[200px]">
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider font-medium">Delay (minutes)</label>
                  <input type="number" value={form.delay_minutes} onChange={e => setForm(f => ({ ...f, delay_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                </div>
              )}
              <p className="text-[9px] text-[var(--warm-400)] leading-relaxed">{DELAY_HELP[form.delay_rule]}</p>

              {/* Active toggle */}
              {!isNew && (
                <div className="flex items-center justify-between py-2 border-t border-[var(--warm-50)]">
                  <span className="text-xs text-[var(--warm-600)]">Active</span>
                  <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                    className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${form.active ? 'bg-[var(--green-600)]' : 'bg-[var(--warm-200)]'}`}>
                    <motion.div className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
                      animate={{ left: form.active ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </button>
                </div>
              )}

              {/* Send Test */}
              {!isNew && (
                <div className="pt-3 border-t border-dashed border-[var(--warm-100)] space-y-2">
                  <p className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Send Test</p>
                  <div className="flex items-center gap-2">
                    <select value={testChannel ?? ''} onChange={e => setTestChannel((e.target.value || null) as MessageChannel | null)}
                      className="px-2.5 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none">
                      <option value="">Channel...</option>
                      {form.channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                    <input value={testTo} onChange={e => setTestTo(e.target.value)}
                      placeholder={testChannel === 'email' ? 'email@example.com' : '+447...'}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
                    <button onClick={handleSendTest} disabled={testSending || !testChannel || !testTo}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50">
                      {testSending ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Send
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--warm-100)] bg-[var(--warm-50)]/50 shrink-0">
              <div>
                {!isNew && (
                  confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">Delete?</span>
                      <button onClick={handleDelete} className="text-xs text-red-600 font-medium hover:text-red-700">Yes</button>
                      <button onClick={() => setConfirmDelete(false)} className="text-xs text-[var(--warm-400)]">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={11} /> Delete
                    </button>
                  )
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)] transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-[var(--green-600)] rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {isNew ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
