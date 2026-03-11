'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLeads, useOpportunities, useSoftDeleteLead, useRestoreLead, usePermanentDeleteLead, useUpdateLead, useProfiles } from '@/lib/crm/hooks'
import { useCurrentProfile } from '@/lib/crm/current-profile'
import { formatDistanceToNow, differenceInHours } from 'date-fns'
import { Search, Filter, Plus, ChevronDown, ChevronUp, Mail, Phone, MapPin, Users, Zap, Trash2, RotateCcw, Upload, CheckSquare, Square, X, UserCheck, Tag, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import CsvImportModal from '@/components/crm/CsvImportModal'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NewLeadModal from '@/components/crm/NewLeadModal'
import Button from '@/components/crm/Button'
import EmptyState from '@/components/crm/EmptyState'
import { getSuggestion, type Suggestion } from '@/lib/crm/suggestions'
import { useAIPreferences } from '@/lib/crm/ai-preferences'

type SortField = 'name' | 'created_at' | 'status'
type SortDir = 'asc' | 'desc'

export default function LeadsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showNewLead, setShowNewLead] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [showImport, setShowImport] = useState(false)

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAssignId, setBulkAssignId] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const qc = useQueryClient()
  const { data: profiles = [] } = useProfiles()
  const { data: opportunities = [] } = useOpportunities(isAdmin ? undefined : ownerFilter)
  const { suggestionsOn } = useAIPreferences()

  // Map lead_id → best suggestion from their active opportunities
  const nextActionMap = useMemo(() => {
    if (!suggestionsOn) return {}
    const map: Record<string, Suggestion> = {}
    for (const opp of opportunities) {
      if (opp.stage === 'lost' || opp.stage === 'complete') continue
      const suggestion = getSuggestion(opp)
      if (!suggestion) continue
      // Keep the highest urgency suggestion per lead
      const existing = map[opp.lead_id]
      const urgencyRank = { high: 3, medium: 2, low: 1 }
      if (!existing || urgencyRank[suggestion.urgency] > urgencyRank[existing.urgency]) {
        map[opp.lead_id] = suggestion
      }
    }
    return map
  }, [opportunities, suggestionsOn])

  const filtered = leads
    .filter((lead) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.phone?.includes(q) ||
        lead.postcode?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'name') return a.name.localeCompare(b.name) * dir
      if (sortField === 'status') return (a.status ?? '').localeCompare(b.status ?? '') * dir
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
    })

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

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
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
      </div>

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
            <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 mb-2 bg-[var(--green-50)] border border-[var(--green-200)] rounded-xl">
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
                  {/* Select-all checkbox */}
                  <th className="w-10 pl-4 py-3">
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
                    className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Name
                      {sortField === 'name' && (sortDir === 'asc'
                        ? <ChevronUp size={11} />
                        : <ChevronDown size={11} />
                      )}
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider hidden md:table-cell">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider hidden lg:table-cell">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider hidden lg:table-cell">
                    Project
                  </th>
                  <th
                    onClick={() => toggleSort('status')}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      {sortField === 'status' && (sortDir === 'asc'
                        ? <ChevronUp size={11} />
                        : <ChevronDown size={11} />
                      )}
                    </span>
                  </th>
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
                      {sortField === 'created_at' && (sortDir === 'asc'
                        ? <ChevronUp size={11} />
                        : <ChevronDown size={11} />
                      )}
                    </span>
                  </th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                    onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    className={`border-b border-[var(--warm-50)] hover:bg-[var(--warm-50)]/50 active:bg-[var(--green-50)]/50 transition-all group cursor-pointer ${selectedIds.has(lead.id) ? 'bg-[var(--green-50)]/40' : i % 2 === 1 ? 'bg-[var(--warm-50)]/30' : ''}`}
                  >
                    {/* Row checkbox */}
                    <td className="w-10 pl-4 py-3.5" onClick={(e) => toggleSelect(lead.id, e)}>
                      {selectedIds.has(lead.id)
                        ? <CheckSquare size={14} className="text-[var(--green-600)]" />
                        : <Square size={14} className="text-[var(--warm-200)] group-hover:text-[var(--warm-400)] transition-colors" />
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* Left accent on hover */}
                        <div className="w-0 group-hover:w-[3px] h-8 bg-[var(--green-500)] rounded-r transition-all duration-200 -ml-5 mr-2 shrink-0" />
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
                        {lead.email && (
                          <span className="flex items-center gap-1.5 text-xs text-[var(--warm-500)]">
                            <Mail size={11} className="text-[var(--warm-300)]" /> {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-[var(--warm-500)]">
                            <Phone size={11} className="text-[var(--warm-300)]" /> {lead.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {lead.postcode && (
                        <span className="flex items-center gap-1 text-xs text-[var(--warm-500)]">
                          <MapPin size={11} className="text-[var(--warm-300)]" /> {lead.postcode}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-[var(--warm-500)]">
                        {lead.project_type ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusColors[lead.status] ?? 'bg-gray-50 text-gray-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    {suggestionsOn && Object.keys(nextActionMap).length > 0 && (
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        {nextActionMap[lead.id] ? (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium max-w-[200px] truncate ${
                            nextActionMap[lead.id].urgency === 'high'
                              ? 'text-red-600'
                              : nextActionMap[lead.id].urgency === 'medium'
                              ? 'text-amber-600'
                              : 'text-[var(--warm-500)]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              nextActionMap[lead.id].urgency === 'high'
                                ? 'bg-red-500'
                                : nextActionMap[lead.id].urgency === 'medium'
                                ? 'bg-amber-400'
                                : 'bg-[var(--warm-300)]'
                            }`} />
                            {nextActionMap[lead.id].action.split(' — ')[0]}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--warm-300)]">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-[var(--warm-400)]">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {showTrash ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); restoreLead.mutate(lead.id) }}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <RotateCcw size={13} />
                          </button>
                          {confirmDeleteId === lead.id ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); permanentDelete.mutate(lead.id); setConfirmDeleteId(null) }}
                              className="px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(lead.id) }}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); softDelete.mutate(lead.id) }}
                          className="p-1.5 text-[var(--warm-300)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Move to trash"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} />}
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
