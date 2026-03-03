'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Mail, Clock, Zap, Plus, Loader2, Search, ChevronDown, ChevronRight,
  Edit3, Copy, Send, Eye, EyeOff,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMessageTemplates, useUpdateTemplate, useCreateTemplate } from '@/lib/crm/hooks'
import type { MessageTemplate, MessageChannel } from '@/lib/crm/types'
import {
  CHANNEL_OPTIONS, STAGE_OPTIONS, formatDelay, stageLabel, stageOrder,
} from './template-constants'
import TemplateEditorPanel from './TemplateEditorPanel'

type FilterChannel = MessageChannel | 'all'
type FilterStatus = 'all' | 'active' | 'inactive'

function useQueueDepth() {
  return useQuery({
    queryKey: ['queue_depth'],
    queryFn: async () => {
      const res = await fetch('/api/cron/messages')
      if (!res.ok) return { ready_to_send: 0, scheduled: 0, total_queued: 0 }
      return res.json() as Promise<{ ready_to_send: number; scheduled: number; total_queued: number }>
    },
    refetchInterval: 30000,
  })
}

export default function TemplatesSection() {
  const { data: templates = [], isLoading } = useMessageTemplates()
  const updateTemplate = useUpdateTemplate()
  const createTemplate = useCreateTemplate()
  const { data: queue } = useQueueDepth()
  const qc = useQueryClient()
  const [processing, setProcessing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterChannel, setFilterChannel] = useState<FilterChannel>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Editor panel
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Filter templates
  const filtered = useMemo(() => {
    let result = templates
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q)
      )
    }
    if (filterStage !== 'all') {
      if (filterStage === 'manual') {
        result = result.filter(t => !t.trigger_stage)
      } else {
        result = result.filter(t => t.trigger_stage === filterStage)
      }
    }
    if (filterChannel !== 'all') {
      result = result.filter(t => t.channels.includes(filterChannel))
    }
    if (filterStatus !== 'all') {
      result = result.filter(t => filterStatus === 'active' ? t.active : !t.active)
    }
    return result
  }, [templates, search, filterStage, filterChannel, filterStatus])

  // Group by stage
  const groups = useMemo(() => {
    const map = new Map<string, MessageTemplate[]>()
    for (const t of filtered) {
      const key = t.trigger_stage || '_manual'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    // Sort groups by pipeline order
    return [...map.entries()]
      .sort(([a], [b]) => stageOrder(a === '_manual' ? null : a) - stageOrder(b === '_manual' ? null : b))
      .map(([key, items]) => ({
        key,
        label: key === '_manual' ? 'Manual (no trigger)' : stageLabel(key),
        templates: items.sort((a, b) => (a.delay_minutes ?? 0) - (b.delay_minutes ?? 0)),
      }))
  }, [filtered])

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleClone(t: MessageTemplate) {
    try {
      await createTemplate.mutateAsync({
        name: `Copy of ${t.name}`,
        slug: `${t.slug}_copy`,
        subject: t.subject,
        body: t.body,
        channels: [...t.channels],
        trigger_stage: t.trigger_stage,
        delay_rule: t.delay_rule,
        delay_minutes: t.delay_minutes,
      })
      toast.success('Template cloned')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function processQueue() {
    setProcessing(true)
    try {
      const res = await fetch('/api/cron/messages', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Processed ${data.processed} message${data.processed !== 1 ? 's' : ''}`)
        qc.invalidateQueries({ queryKey: ['queue_depth'] })
      } else {
        toast.error(data.error ?? 'Failed to process queue')
      }
    } catch { toast.error('Failed to process queue') }
    finally { setProcessing(false) }
  }

  const hasFilters = search || filterStage !== 'all' || filterChannel !== 'all' || filterStatus !== 'all'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--warm-300)]" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Queue status */}
      {queue && queue.total_queued > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Mail size={12} className="text-blue-600" />
              <span className="text-xs font-medium text-blue-700">{queue.ready_to_send} ready</span>
            </div>
            {queue.scheduled > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-amber-500" />
                <span className="text-xs text-amber-600">{queue.scheduled} scheduled</span>
              </div>
            )}
          </div>
          <button onClick={processQueue} disabled={processing || queue.ready_to_send === 0}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50">
            {processing ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
            Process Now
          </button>
        </div>
      )}

      {/* Search + Filters + New button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-300)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white" />
        </div>
        <div className="flex gap-1.5 items-center">
          <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
            className="px-2.5 py-2 text-[11px] border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white text-[var(--warm-600)]">
            <option value="all">All stages</option>
            <option value="manual">Manual only</option>
            {STAGE_OPTIONS.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value as FilterChannel)}
            className="px-2.5 py-2 text-[11px] border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white text-[var(--warm-600)]">
            <option value="all">All channels</option>
            {CHANNEL_OPTIONS.map(ch => <option key={ch.value} value={ch.value}>{ch.icon} {ch.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="px-2.5 py-2 text-[11px] border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white text-[var(--warm-600)]">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={() => { setIsCreating(true); setEditingTemplate(null) }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[var(--green-600)] rounded-xl hover:bg-[var(--green-700)] transition-colors whitespace-nowrap">
            <Plus size={13} /> New
          </button>
        </div>
      </div>

      {/* Results count */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--warm-400)]">
            {filtered.length} of {templates.length} templates
          </p>
          <button onClick={() => { setSearch(''); setFilterStage('all'); setFilterChannel('all'); setFilterStatus('all') }}
            className="text-[11px] text-[var(--green-600)] hover:text-[var(--green-700)] font-medium">
            Clear filters
          </button>
        </div>
      )}

      {/* Grouped template list */}
      {groups.map(group => {
        const collapsed = collapsedGroups.has(group.key)
        return (
          <div key={group.key} className="rounded-2xl border border-[var(--warm-100)] overflow-hidden bg-white">
            {/* Group header */}
            <button onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--warm-50)]/50 hover:bg-[var(--warm-50)] transition-colors">
              <div className="flex items-center gap-2">
                {collapsed
                  ? <ChevronRight size={14} className="text-[var(--warm-400)]" />
                  : <ChevronDown size={14} className="text-[var(--warm-400)]" />
                }
                <span className="text-xs font-semibold text-[var(--warm-700)]">{group.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--warm-100)] text-[var(--warm-500)] font-medium">
                  {group.templates.length}
                </span>
              </div>
              {group.key !== '_manual' && (
                <span className="flex items-center gap-1 text-[10px] text-blue-500">
                  <Zap size={9} /> Auto-triggered
                </span>
              )}
            </button>

            {/* Template cards */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-[var(--warm-50)]">
                    {group.templates.map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        onEdit={() => { setEditingTemplate(t); setIsCreating(false) }}
                        onClone={() => handleClone(t)}
                        onToggleActive={() => updateTemplate.mutate({ id: t.id, active: !t.active })}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-[var(--warm-300)]">
            {hasFilters ? 'No templates match your filters.' : 'No templates yet. Create one to get started.'}
          </p>
        </div>
      )}

      {/* Editor panel */}
      <TemplateEditorPanel
        template={isCreating ? null : editingTemplate}
        isNew={isCreating}
        onClose={() => { setEditingTemplate(null); setIsCreating(false) }}
      />
    </div>
  )
}

// ─── Template Card ──────────────────────────────────────────────────────────

function TemplateCard({ template: t, onEdit, onClone, onToggleActive }: {
  template: MessageTemplate
  onEdit: () => void
  onClone: () => void
  onToggleActive: () => void
}) {
  // Truncate body to first 2 lines
  const bodyPreview = t.body.split('\n').filter(l => l.trim()).slice(0, 2).join(' ').slice(0, 120)

  return (
    <div className={`group px-4 py-3 hover:bg-[var(--warm-50)]/50 transition-colors ${!t.active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Left: content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-[var(--warm-800)] truncate">{t.name}</span>
            {!t.active && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--warm-100)] text-[var(--warm-400)] shrink-0">Off</span>
            )}
          </div>
          {t.subject && (
            <p className="text-xs text-[var(--warm-500)] truncate mb-0.5">{t.subject}</p>
          )}
          <p className="text-[11px] text-[var(--warm-400)] truncate leading-relaxed">
            {bodyPreview}{bodyPreview.length >= 120 ? '...' : ''}
          </p>
          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {t.channels.map(ch => (
              <span key={ch} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--warm-50)] text-[var(--warm-500)] font-medium ring-1 ring-[var(--warm-100)]">
                {CHANNEL_OPTIONS.find(c => c.value === ch)?.icon ?? ''} {ch}
              </span>
            ))}
            {t.delay_rule !== 'immediate' && (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium ring-1 ring-amber-100">
                <Clock size={8} /> {formatDelay(t.delay_minutes ?? 0)} {t.delay_rule === 'minutes_before_booking' ? 'before' : 'after'}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions (visible on hover) */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} title="Edit"
            className="p-1.5 rounded-lg hover:bg-[var(--warm-100)] transition-colors">
            <Edit3 size={13} className="text-[var(--warm-500)]" />
          </button>
          <button onClick={onClone} title="Clone"
            className="p-1.5 rounded-lg hover:bg-[var(--warm-100)] transition-colors">
            <Copy size={13} className="text-[var(--warm-500)]" />
          </button>
          <button onClick={onToggleActive} title={t.active ? 'Deactivate' : 'Activate'}
            className="p-1.5 rounded-lg hover:bg-[var(--warm-100)] transition-colors">
            {t.active
              ? <EyeOff size={13} className="text-[var(--warm-400)]" />
              : <Eye size={13} className="text-[var(--green-600)]" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
