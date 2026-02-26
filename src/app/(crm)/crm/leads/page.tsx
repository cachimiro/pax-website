'use client'

import { useState } from 'react'
import { useLeads } from '@/lib/crm/hooks'
import { formatDistanceToNow } from 'date-fns'
import { Search, Filter, Plus, ChevronDown, Mail, Phone, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import NewLeadModal from '@/components/crm/NewLeadModal'

type SortField = 'name' | 'created_at' | 'status'
type SortDir = 'asc' | 'desc'

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showNewLead, setShowNewLead] = useState(false)

  const { data: leads = [], isLoading } = useLeads(
    statusFilter ? { status: statusFilter } : undefined
  )

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
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">Leads</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">{filtered.length} total</p>
        </div>
        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--green-700)] hover:bg-[var(--green-900)] text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          <Plus size={16} />
          New Lead
        </button>
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
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-[var(--warm-50)] rounded-xl shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--warm-50)] flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-[var(--warm-300)]" />
            </div>
            <p className="text-sm font-medium text-[var(--warm-600)]">No leads found</p>
            <p className="text-xs text-[var(--warm-400)] mt-1 mb-4">
              {search ? 'Try a different search term' : 'Create your first lead to get started'}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewLead(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[var(--green-700)] rounded-lg hover:bg-[var(--green-900)] transition-colors"
              >
                <Plus size={14} /> Create Lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--warm-100)] bg-[var(--warm-50)]/50">
                  <th
                    onClick={() => toggleSort('name')}
                    className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors"
                  >
                    Name {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
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
                    Status {sortField === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('created_at')}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--warm-700)] transition-colors hidden sm:table-cell"
                  >
                    Created {sortField === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-[var(--warm-50)] hover:bg-[var(--warm-50)]/50 transition-colors group ${i % 2 === 1 ? 'bg-[var(--warm-50)]/30' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* Left accent on hover */}
                        <div className="w-0 group-hover:w-[3px] h-8 bg-[var(--green-500)] rounded-r transition-all duration-200 -ml-5 mr-2 shrink-0" />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-xs font-bold text-[var(--green-700)] shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="text-sm font-semibold text-[var(--warm-800)] hover:text-[var(--green-700)] transition-colors"
                        >
                          {lead.name}
                        </Link>
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
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-[var(--warm-400)]">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} />}
    </div>
  )
}
