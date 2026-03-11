'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useLeads, useOpportunities, useSoftDeleteLead, useRestoreLead, usePermanentDeleteLead, useUpdateLead, useProfiles, useTasks } from '@/lib/crm/hooks'
import { useCurrentProfile } from '@/lib/crm/current-profile'
import { formatDistanceToNow, differenceInDays, isFuture } from 'date-fns'
import { Search, Filter, Plus, ChevronDown, ChevronUp, Mail, Phone, MapPin, Users, Zap, Trash2, RotateCcw, Upload, CheckSquare, Square, X, UserCheck, Tag, Download, Columns, Clock, GitMerge, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import CsvImportModal from '@/components/crm/CsvImportModal'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import NewLeadModal from '@/components/crm/NewLeadModal'
import Button from '@/components/crm/Button'
import EmptyState from '@/components/crm/EmptyState'
import { getSuggestion, type Suggestion } from '@/lib/crm/suggestions'
import { useAIPreferences } from '@/lib/crm/ai-preferences'
import { STAGES } from '@/lib/crm/stages'
import MergeLeadsModal from '@/components/crm/MergeLeadsModal'
import SendConfirmation from '@/components/crm/SendConfirmation'
import type { Lead, MessageChannel } from '@/lib/crm/types'

type SortField = 'name' | 'created_at' | 'status' | 'stage' | 'value' | 'last_contact' | 'days_stale'
type SortDir = 'asc' | 'desc'

// Optional columns that can be toggled
type OptionalCol = 'stage' | 'value' | 'last_contact' | 'days_stale'
const OPTIONAL_COLS: { key: OptionalCol; label: string }[] = [
  { key: 'stage',        label: 'Stage' },
  { key: 'value',        label: 'Value' },
  { key: 'last_contact', label: 'Last Contact' },
  { key: 'days_stale',   label: 'Days Stale' },
]
const DEFAULT_COLS: OptionalCol[] = ['stage', 'value', 'last_contact', 'days_stale']

function loadColPrefs(): Set<OptionalCol> {
  try {
    const raw = localStorage.getItem('leads_cols')
    if (raw) return new Set(JSON.parse(raw) as OptionalCol[])
  } catch {}
  return new Set(DEFAULT_COLS)
}

type HealthTier = 'hot' | 'warm' | 'cold' | 'snoozed'

function computeHealth(
  lead: Lead,
  hasOpenOpp: boolean,
  overdueTasks: number,
  daysSinceContact: number,
): { tier: HealthTier; tooltip: string } {
  if (lead.snoozed_until && isFuture(new Date(lead.snoozed_until))) {
    return { tier: 'snoozed', tooltip: 'Snoozed — nudges paused' }
  }
  if (hasOpenOpp && daysSinceContact <= 7 && overdueTasks === 0) {
    return { tier: 'hot', tooltip: `Hot — last contacted ${daysSinceContact}d ago` }
  }
  if (hasOpenOpp && daysSinceContact <= 21 && overdueTasks <= 1) {
    return { tier: 'warm', tooltip: `Warm — last contacted ${daysSinceContact}d ago${overdueTasks ? ', 1 overdue task' : ''}` }
  }
  const parts: string[] = []
  if (!hasOpenOpp) parts.push('no open opportunity')
  if (daysSinceContact > 21) parts.push(`last contacted ${daysSinceContact}d ago`)
  if (overdueTasks >= 2) parts.push(`${overdueTasks} overdue tasks`)
  return { tier: 'cold', tooltip: `Cold — ${parts.join(', ')}` }
}

export default function LeadsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showNewLead, setShowNewLead] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // Advanced filters
  const [filterOwner, setFilterOwner] = useState('')
  const [filterProjectType, setFilterProjectType] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Column picker
  const [visibleCols, setVisibleCols] = useState<Set<OptionalCol>>(new Set(DEFAULT_COLS))
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setVisibleCols(loadColPrefs()) }, [])
  useEffect(() => {
    if (!showColPicker) return
    function handler(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColPicker])
  function toggleCol(col: OptionalCol) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(col)) { next.delete(col) } else { next.add(col) }
      localStorage.setItem('leads_cols', JSON.stringify([...next]))
      return next
    })
  }

  // Duplicate detection dismiss
  const [dupDismissed, setDupDismissed] = useState(false)
  useEffect(() => { setDupDismissed(sessionStorage.getItem('dup_dismissed') === '1') }, [])

  // Merge modal
  const [showMerge, setShowMerge] = useState(false)

  // Inline compose (quick actions)
  const [composeTarget, setComposeTarget] = useState<{ lead: Lead; channel: MessageChannel } | null>(null)

  const { profile, isAdmin } = useCurrentProfile()
  const ownerFilter = isAdmin ? undefined : { owner_user_id: profile?.id }

  const { data: leads = [], isLoading } = useLeads(
    showTrash
      ? { deleted: true, ...ownerFilter }
      : { ...(statusFilter ? { status: statusFilter } : {}), ...ownerFilter }
  )
  const softDelete = useSoftDeleteLead()
  const restoreLead = useRestoreLead()
  const permanentDelete = usePermanentDeleteLead()
  const updateLead = useUpdateLead()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAssignId, setBulkAssignId] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const qc = useQueryClient()
  const { data: profiles = [] } = useProfiles()
  const { data: opportunities = [] } = useOpportunities(isAdmin ? undefined : ownerFilter)
  const { data: allTasks = [] } = useTasks()
  const { suggestionsOn } = useAIPreferences()

  // ── Derived maps ────────────────────────────────────────────────────────────

  // primary opportunity per lead (most recently updated, non-closed)
  const primaryOppMap = useMemo(() => {
    const map: Record<string, typeof opportunities[0]> = {}
    for (const opp of opportunities) {
      if (opp.stage === 'lost' || opp.stage === 'closed_not_interested') continue
      const existing = map[opp.lead_id]
      if (!existing || new Date(opp.updated_at) > new Date(existing.updated_at)) {
        map[opp.lead_id] = opp
      }
    }
    return map
  }, [opportunities])

  // last message sent per lead (we approximate from opportunities updated_at since we don't load all message_logs here)
  // We use lead.created_at as fallback; days_stale uses opportunity updated_at
  const staleMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const lead of leads) {
      const opp = primaryOppMap[lead.id]
      const ref = opp ? new Date(opp.updated_at) : new Date(lead.created_at)
      map[lead.id] = differenceInDays(new Date(), ref)
    }
    return map
  }, [leads, primaryOppMap])

  // overdue tasks per lead (tasks link to opportunities, so we join via opp → lead)
  const overdueTaskMap = useMemo(() => {
    // Build opp_id → lead_id lookup
    const oppToLead: Record<string, string> = {}
    for (const opp of opportunities) oppToLead[opp.id] = opp.lead_id

    const map: Record<string, number> = {}
    for (const t of allTasks) {
      if (!t.opportunity_id || t.status !== 'open' || !t.due_at) continue
      if (new Date(t.due_at) >= new Date()) continue
      const leadId = oppToLead[t.opportunity_id]
      if (!leadId) continue
      map[leadId] = (map[leadId] ?? 0) + 1
    }
    return map
  }, [allTasks, opportunities])

  // AI next-action map
  const nextActionMap = useMemo(() => {
    if (!suggestionsOn) return {}
    const map: Record<string, Suggestion> = {}
    for (const opp of opportunities) {
      if (opp.stage === 'lost' || opp.stage === 'complete') continue
      const suggestion = getSuggestion(opp)
      if (!suggestion) continue
      const existing = map[opp.lead_id]
      const urgencyRank = { high: 3, medium: 2, low: 1 }
      if (!existing || urgencyRank[suggestion.urgency] > urgencyRank[existing.urgency]) {
        map[opp.lead_id] = suggestion
      }
    }
    return map
  }, [opportunities, suggestionsOn])

  // Distinct values for advanced filter dropdowns
  const projectTypes = useMemo(() =>
    [...new Set(leads.map(l => l.project_type).filter(Boolean) as string[])].sort()
  , [leads])
  const sources = useMemo(() =>
    [...new Set(leads.map(l => l.source).filter(Boolean) as string[])].sort()
  , [leads])

  const activeFilterCount = [filterOwner, filterProjectType, filterSource, filterDateFrom, filterDateTo].filter(Boolean).length

  // ── Filtering & sorting ─────────────────────────────────────────────────────
  const filtered = useMemo(() => leads
    .filter((lead) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !lead.name.toLowerCase().includes(q) &&
          !lead.email?.toLowerCase().includes(q) &&
          !lead.phone?.includes(q) &&
          !lead.postcode?.toLowerCase().includes(q)
        ) return false
      }
      if (filterOwner && lead.owner_user_id !== filterOwner) return false
      if (filterProjectType && lead.project_type !== filterProjectType) return false
      if (filterSource && lead.source !== filterSource) return false
      if (filterDateFrom && new Date(lead.created_at) < new Date(filterDateFrom)) return false
      if (filterDateTo && new Date(lead.created_at) > new Date(filterDateTo + 'T23:59:59')) return false
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'name') return a.name.localeCompare(b.name) * dir
      if (sortField === 'status') return (a.status ?? '').localeCompare(b.status ?? '') * dir
      if (sortField === 'stage') {
        const sa = primaryOppMap[a.id]?.stage ?? ''
        const sb = primaryOppMap[b.id]?.stage ?? ''
        return sa.localeCompare(sb) * dir
      }
      if (sortField === 'value') {
        return ((primaryOppMap[a.id]?.value_estimate ?? 0) - (primaryOppMap[b.id]?.value_estimate ?? 0)) * dir
      }
      if (sortField === 'days_stale') return ((staleMap[a.id] ?? 0) - (staleMap[b.id] ?? 0)) * dir
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
    })
  , [leads, search, filterOwner, filterProjectType, filterSource, filterDateFrom, filterDateTo, sortField, sortDir, primaryOppMap, staleMap])

  // ── Duplicate detection ─────────────────────────────────────────────────────
  const duplicateGroups = useMemo(() => {
    if (showTrash) return []
    const emailMap: Record<string, Lead[]> = {}
    const phoneMap: Record<string, Lead[]> = {}
    for (const lead of leads) {
      if (lead.email) (emailMap[lead.email.toLowerCase()] ??= []).push(lead)
      if (lead.phone) (phoneMap[lead.phone] ??= []).push(lead)
    }
    const groups: Lead[][] = []
    const seen = new Set<string>()
    for (const group of [...Object.values(emailMap), ...Object.values(phoneMap)]) {
      if (group.length < 2) continue
      const key = group.map(l => l.id).sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      groups.push(group)
    }
    return groups
  }, [leads, showTrash])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // ── Bulk selection helpers ──────────────────────────────────────────────────
  const allFilteredIds = filtered.map((l) => l.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id))
  const someSelected = selectedIds.size > 0
  const canMerge = selectedIds.size === 2

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) } return n })
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allFilteredIds))
  }

  function clearSelection() { setSelectedIds(new Set()) }

  async function bulkTrash() {
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) =>
      createClient().from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    ))
    qc.invalidateQueries({ queryKey: ['leads'] })
    toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} moved to trash`)
    clearSelection()
  }

  async function bulkAssign() {
    if (!bulkAssignId) return
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) =>
      createClient().from('leads').update({ owner_user_id: bulkAssignId }).eq('id', id)
    ))
    qc.invalidateQueries({ queryKey: ['leads'] })
    toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} assigned`)
    setBulkAssignId('')
    clearSelection()
  }

  async function bulkSetStatus() {
    if (!bulkStatus) return
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) =>
      createClient().from('leads').update({ status: bulkStatus }).eq('id', id)
    ))
    qc.invalidateQueries({ queryKey: ['leads'] })
    toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} updated`)
    setBulkStatus('')
    clearSelection()
  }

  function bulkExportCsv() {
    const rows = filtered.filter((l) => selectedIds.has(l.id))
    const header = ['Name', 'Email', 'Phone', 'Postcode', 'Status', 'Project Type', 'Created']
    const lines = [
      header.join(','),
      ...rows.map((l) => [
        `"${l.name}"`, l.email ?? '', l.phone ?? '',
        l.postcode ?? '', l.status, l.project_type ?? '',
        new Date(l.created_at).toLocaleDateString('en-GB'),
      ].join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const statusColors: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    contacted: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    lost: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  }

  // Merge modal: get the two selected leads
  const selectedLeads = leads.filter(l => selectedIds.has(l.id))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">{showTrash ? 'Trash' : 'Leads'}</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">{filtered.length} {showTrash ? 'deleted' : 'total'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowTrash(!showTrash); setStatusFilter('') }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
              showTrash
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-[var(--warm-500)] border-[var(--warm-100)] hover:border-[var(--warm-200)]'
            }`}
          >
            <Trash2 size={13} /> Trash
          </button>
          {!showTrash && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border bg-white text-[var(--warm-500)] border-[var(--warm-100)] hover:border-[var(--warm-200)] transition-colors"
              >
                <Upload size={13} /> Import CSV
              </button>
              <Button onClick={() => setShowNewLead(true)} icon={<Plus size={16} />}>
                New Lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Duplicate detection banner */}
      {!showTrash && !dupDismissed && duplicateGroups.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={13} className="shrink-0" />
            <span><strong>{duplicateGroups.length}</strong> potential duplicate lead{duplicateGroups.length !== 1 ? 's' : ''} detected.</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                // Pre-select first duplicate pair for review
                const pair = duplicateGroups[0]
                setSelectedIds(new Set(pair.slice(0, 2).map(l => l.id)))
                setShowMerge(true)
              }}
              className="font-medium text-amber-700 hover:text-amber-900 underline"
            >
              Review →
            </button>
            <button
              onClick={() => { sessionStorage.setItem('dup_dismissed', '1'); setDupDismissed(true) }}
              className="text-amber-500 hover:text-amber-700"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Search + status filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-300)]" />
          <input
            type="text"
            placeholder="Search by name, email, phone, postcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[var(--warm-100)] rounded-xl
              focus:border-[var(--green-500)] focus:outline-none focus:shadow-sm
              placeholder:text-[var(--warm-300)] text-[var(--warm-800)] transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-300)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-8 pr-8 py-2.5 text-sm bg-white border border-[var(--warm-100)] rounded-xl
              focus:border-[var(--green-500)] focus:outline-none appearance-none
              text-[var(--warm-700)] cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="lost">Lost</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--warm-300)] pointer-events-none" />
        </div>
        {/* Advanced filters toggle */}
        {!showTrash && (
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[var(--green-50)] text-[var(--green-700)] border-[var(--green-200)]'
                : 'bg-white text-[var(--warm-500)] border-[var(--warm-100)] hover:border-[var(--warm-200)]'
            }`}
          >
            <Filter size={12} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-[var(--green-600)] text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Advanced filter panel */}
      <AnimatePresence>
        {showFilters && !showTrash && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-3 mb-4 p-4 bg-white border border-[var(--warm-100)] rounded-xl">
              {isAdmin && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Owner</label>
                  <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
                    className="text-xs border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[var(--green-500)] min-w-[140px]">
                    <option value="">All owners</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              )}
              {projectTypes.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Project Type</label>
                  <select value={filterProjectType} onChange={e => setFilterProjectType(e.target.value)}
                    className="text-xs border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[var(--green-500)] min-w-[140px]">
                    <option value="">All types</option>
                    {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              {sources.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Source</label>
                  <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                    className="text-xs border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[var(--green-500)] min-w-[140px]">
                    <option value="">All sources</option>
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Created From</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  className="text-xs border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[var(--green-500)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Created To</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  className="text-xs border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[var(--green-500)]" />
              </div>
              {activeFilterCount > 0 && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setFilterOwner(''); setFilterProjectType(''); setFilterSource(''); setFilterDateFrom(''); setFilterDateTo('') }}
                    className="text-xs text-[var(--warm-500)] hover:text-red-500 transition-colors pb-1.5"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden card-hover-border">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-[var(--warm-50)] rounded-xl shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title={showTrash ? 'Trash is empty' : 'No leads found'}
            description={search ? 'Try a different search term' : showTrash ? 'Deleted leads will appear here for 30 days before permanent removal.' : 'Add leads manually, import a CSV, or share your booking link to start collecting enquiries.'}
            tip={search ? undefined : showTrash ? undefined : 'Tip: Share paxbespoke.uk/book with clients — bookings auto-create leads in the CRM.'}
            action={
              !search && !showTrash ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowNewLead(true)} icon={<Plus size={14} />}>
                    Create Lead
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowImport(true)} icon={<Upload size={14} />}>
                    Import CSV
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <>
          {/* Bulk action toolbar */}
          {someSelected && (
            <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 mb-2 bg-[var(--green-50)] border border-[var(--green-200)] rounded-xl mx-0">
              <span className="text-xs font-semibold text-[var(--green-700)] mr-1">
                {selectedIds.size} selected
              </span>

              {/* Assign owner — admin only */}
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <select
                    value={bulkAssignId}
                    onChange={(e) => setBulkAssignId(e.target.value)}
                    className="text-xs border border-[var(--warm-200)] rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[var(--green-500)]"
                  >
                    <option value="">Assign to…</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                  {bulkAssignId && (
                    <button onClick={bulkAssign} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[var(--green-600)] text-white rounded-lg hover:bg-[var(--green-700)] transition-colors">
                      <UserCheck size={11} /> Apply
                    </button>
                  )}
                </div>
              )}

              {/* Change status */}
              <div className="flex items-center gap-1">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="text-xs border border-[var(--warm-200)] rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[var(--green-500)]"
                >
                  <option value="">Set status…</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="lost">Lost</option>
                </select>
                {bulkStatus && (
                  <button onClick={bulkSetStatus} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[var(--green-600)] text-white rounded-lg hover:bg-[var(--green-700)] transition-colors">
                    <Tag size={11} /> Apply
                  </button>
                )}
              </div>

              {/* Export CSV */}
              <button
                onClick={bulkExportCsv}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-[var(--warm-200)] bg-white text-[var(--warm-700)] rounded-lg hover:bg-[var(--warm-50)] transition-colors"
              >
                <Download size={11} /> Export CSV
              </button>

              {/* Merge — only when exactly 2 selected */}
              {canMerge && (
                <button
                  onClick={() => setShowMerge(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-[var(--green-300)] bg-white text-[var(--green-700)] rounded-lg hover:bg-[var(--green-50)] transition-colors"
                >
                  <GitMerge size={11} /> Merge
                </button>
              )}

              {/* Trash */}
              <button
                onClick={bulkTrash}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 size={11} /> Trash
              </button>

              {/* Clear */}
              <button onClick={clearSelection} className="ml-auto p-1 text-[var(--warm-400)] hover:text-[var(--warm-600)]">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--warm-100)] bg-[var(--warm-50)]/50">
                  {/* Health dot */}
                  <th className="w-6 pl-3 py-3" />
                  {/* Select-all checkbox */}
                  <th className="w-8 pl-1 py-3">
                    <button
                      onClick={toggleSelectAll}
                      className="text-[var(--warm-300)] hover:text-[var(--green-600)] transition-colors"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allSelected
                        ? <CheckSquare size={14} className="text-[var(--green-600)]" />
                        : <Square size={14} />
                      }
                    </button>
                  </th>
                  <th
                    onClick={() => toggleSort('name')}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Name
                      {sortField === 'name' && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider hidden lg:table-cell">Project</th>
                  <th
                    onClick={() => toggleSort('status')}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      {sortField === 'status' && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </span>
                  </th>
                  {/* Optional columns */}
                  {visibleCols.has('stage') && (
                    <th onClick={() => toggleSort('stage')} className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors hidden xl:table-cell">
                      <span className="inline-flex items-center gap-1">Stage {sortField === 'stage' && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}</span>
                    </th>
                  )}
                  {visibleCols.has('value') && (
                    <th onClick={() => toggleSort('value')} className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors hidden xl:table-cell">
                      <span className="inline-flex items-center gap-1">Value {sortField === 'value' && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}</span>
                    </th>
                  )}
                  {visibleCols.has('days_stale') && (
                    <th onClick={() => toggleSort('days_stale')} className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors hidden xl:table-cell">
                      <span className="inline-flex items-center gap-1">Stale {sortField === 'days_stale' && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}</span>
                    </th>
                  )}
                  {suggestionsOn && Object.keys(nextActionMap).length > 0 && (
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider hidden xl:table-cell">
                      <span className="flex items-center gap-1"><Zap size={10} /> Next Action</span>
                    </th>
                  )}
                  <th
                    onClick={() => toggleSort('created_at')}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors hidden sm:table-cell"
                  >
                    <span className="inline-flex items-center gap-1">
                      Created
                      {sortField === 'created_at' && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </span>
                  </th>
                  {/* Column picker */}
                  <th className="w-24 pr-3 py-3 text-right">
                    <div className="relative inline-block" ref={colPickerRef}>
                      <button
                        onClick={() => setShowColPicker(v => !v)}
                        title="Toggle columns"
                        className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-600)] rounded-lg transition-colors"
                      >
                        <Columns size={13} />
                      </button>
                      <AnimatePresence>
                        {showColPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-full mt-1 z-50 bg-white border border-[var(--warm-100)] rounded-xl shadow-lg py-2 min-w-[160px]"
                          >
                            <p className="px-3 pb-1.5 text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider">Columns</p>
                            {OPTIONAL_COLS.map(col => (
                              <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--warm-700)] hover:bg-[var(--warm-50)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={visibleCols.has(col.key)}
                                  onChange={() => toggleCol(col.key)}
                                  className="accent-[var(--green-600)]"
                                />
                                {col.label}
                              </label>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const primaryOpp = primaryOppMap[lead.id]
                  const stale = staleMap[lead.id] ?? 0
                  const overdue = overdueTaskMap[lead.id] ?? 0
                  const hasOpenOpp = !!primaryOpp
                  const { tier: healthTier, tooltip: healthTooltip } = computeHealth(lead, hasOpenOpp, overdue, stale)
                  const healthColors: Record<string, string> = { hot: 'bg-emerald-500', warm: 'bg-amber-400', cold: 'bg-[var(--warm-300)]' }
                  const staleColor = stale <= 7 ? 'text-emerald-600' : stale <= 21 ? 'text-amber-600' : 'text-red-500'

                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => router.push(`/crm/leads/${lead.id}`)}
                      className={`border-b border-[var(--warm-50)] hover:bg-[var(--warm-50)]/50 active:bg-[var(--green-50)]/50 transition-all group cursor-pointer ${selectedIds.has(lead.id) ? 'bg-[var(--green-50)]/40' : i % 2 === 1 ? 'bg-[var(--warm-50)]/30' : ''}`}
                    >
                      {/* Health dot */}
                      <td className="pl-3 py-3.5 w-6">
                        <span title={healthTooltip} className="inline-flex items-center justify-center w-4 h-4">
                          {healthTier === 'snoozed'
                            ? <Clock size={11} className="text-blue-400" />
                            : <span className={`w-2 h-2 rounded-full ${healthColors[healthTier]} ${healthTier === 'hot' ? 'animate-pulse' : ''}`} />
                          }
                        </span>
                      </td>
                      {/* Row checkbox */}
                      <td className="w-8 pl-1 py-3.5" onClick={(e) => toggleSelect(lead.id, e)}>
                        {selectedIds.has(lead.id)
                          ? <CheckSquare size={14} className="text-[var(--green-600)]" />
                          : <Square size={14} className="text-[var(--warm-200)] group-hover:text-[var(--warm-400)] transition-colors" />
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-0 group-hover:w-[3px] h-8 bg-[var(--green-500)] rounded-r transition-all duration-200 -ml-4 mr-1 shrink-0" />
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-xs font-bold text-[var(--green-700)] shrink-0 avatar-hover">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-[var(--warm-800)] group-hover:text-[var(--green-700)] transition-colors">
                            {lead.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {lead.email && <span className="flex items-center gap-1.5 text-xs text-[var(--warm-500)]"><Mail size={11} className="text-[var(--warm-300)]" /> {lead.email}</span>}
                          {lead.phone && <span className="flex items-center gap-1.5 text-xs text-[var(--warm-500)]"><Phone size={11} className="text-[var(--warm-300)]" /> {lead.phone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {lead.postcode && <span className="flex items-center gap-1 text-xs text-[var(--warm-500)]"><MapPin size={11} className="text-[var(--warm-300)]" /> {lead.postcode}</span>}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-[var(--warm-500)]">{lead.project_type ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={lead.status}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); updateLead.mutate({ id: lead.id, status: e.target.value as Lead['status'] }) }}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--green-400)] ${statusColors[lead.status] ?? 'bg-gray-50 text-gray-600'}`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                      {/* Optional: Stage */}
                      {visibleCols.has('stage') && (
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          {primaryOpp ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STAGES[primaryOpp.stage]?.color ?? 'bg-gray-50'} ${STAGES[primaryOpp.stage]?.textColor ?? 'text-gray-600'}`}>
                              {STAGES[primaryOpp.stage]?.label ?? primaryOpp.stage}
                            </span>
                          ) : <span className="text-xs text-[var(--warm-300)]">—</span>}
                        </td>
                      )}
                      {/* Optional: Value */}
                      {visibleCols.has('value') && (
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          {primaryOpp?.value_estimate != null
                            ? <span className="text-xs font-medium text-[var(--green-700)]">£{primaryOpp.value_estimate.toLocaleString('en-GB')}</span>
                            : <span className="text-xs text-[var(--warm-300)]">—</span>
                          }
                        </td>
                      )}
                      {/* Optional: Days stale */}
                      {visibleCols.has('days_stale') && (
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          <span className={`text-xs font-medium ${staleColor}`}>{stale}d</span>
                        </td>
                      )}
                      {/* AI next action */}
                      {suggestionsOn && Object.keys(nextActionMap).length > 0 && (
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          {nextActionMap[lead.id] ? (
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium max-w-[200px] truncate ${
                              nextActionMap[lead.id].urgency === 'high' ? 'text-red-600' :
                              nextActionMap[lead.id].urgency === 'medium' ? 'text-amber-600' : 'text-[var(--warm-500)]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                nextActionMap[lead.id].urgency === 'high' ? 'bg-red-500' :
                                nextActionMap[lead.id].urgency === 'medium' ? 'bg-amber-400' : 'bg-[var(--warm-300)]'
                              }`} />
                              {nextActionMap[lead.id].action.split(' — ')[0]}
                            </span>
                          ) : <span className="text-[11px] text-[var(--warm-300)]">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs text-[var(--warm-400)]">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </td>
                      {/* Actions column: quick actions on hover + trash */}
                      <td className="pr-3 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        {showTrash ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => restoreLead.mutate(lead.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Restore">
                              <RotateCcw size={13} />
                            </button>
                            {confirmDeleteId === lead.id ? (
                              <button onClick={() => { permanentDelete.mutate(lead.id); setConfirmDeleteId(null) }} className="px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Confirm</button>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(lead.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete permanently"><Trash2 size={13} /></button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} title="Call" className="p-1.5 text-[var(--warm-400)] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                <Phone size={13} />
                              </a>
                            )}
                            {lead.email && (
                              <button
                                title="Email"
                                onClick={() => setComposeTarget({ lead, channel: 'email' })}
                                className="p-1.5 text-[var(--warm-400)] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Mail size={13} />
                              </button>
                            )}
                            {lead.phone && (
                              <button
                                title="WhatsApp"
                                onClick={() => setComposeTarget({ lead, channel: 'whatsapp' })}
                                className="p-1.5 text-[var(--warm-400)] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Zap size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => softDelete.mutate(lead.id)}
                              className="p-1.5 text-[var(--warm-300)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Move to trash"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} />}
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}

      {/* Merge modal */}
      {showMerge && canMerge && selectedLeads.length === 2 && (
        <MergeLeadsModal
          leadA={selectedLeads[0]}
          leadB={selectedLeads[1]}
          onClose={() => { setShowMerge(false); clearSelection() }}
        />
      )}

      {/* Inline compose from quick actions */}
      {composeTarget && (
        <SendConfirmation
          open
          onClose={() => setComposeTarget(null)}
          lead={composeTarget.lead}
          channel={composeTarget.channel}
          subject=""
          body=""
          senderName="PaxBespoke"
          recentMessages={[]}
          opportunity={primaryOppMap[composeTarget.lead.id] ?? null}
          onSend={async (data) => {
            const { createClient: cc } = await import('@/lib/supabase/client')
            await cc().from('message_logs').insert({
              lead_id: composeTarget.lead.id,
              channel: data.channel,
              status: 'queued',
              metadata: { subject: data.subject, body: data.body },
            })
            qc.invalidateQueries({ queryKey: ['message_logs'] })
            toast.success('Message queued')
            setComposeTarget(null)
          }}
        />
      )}
    </div>
  )
}
