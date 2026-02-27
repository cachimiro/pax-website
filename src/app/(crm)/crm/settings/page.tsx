'use client'

import { useState } from 'react'
import { useProfiles, useServiceRegions, useUpdateServiceRegion } from '@/lib/crm/hooks'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, Mail, MapPin, Edit3, Save, X, ChevronDown, ChevronUp, Copy, Check, Globe } from 'lucide-react'
import { DEFAULT_TEMPLATES } from '@/lib/crm/messaging/templates'
import type { Profile, UserRole, RegionStatus } from '@/lib/crm/types'

type SettingsTab = 'users' | 'templates' | 'coverage'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('users')

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)] mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6">
        {[
          { key: 'users' as const, label: 'Users', icon: <Users size={14} /> },
          { key: 'templates' as const, label: 'Templates', icon: <Mail size={14} /> },
          { key: 'coverage' as const, label: 'Coverage', icon: <Globe size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === t.key
                ? 'bg-[var(--green-600)] text-white shadow-sm'
                : 'text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-[var(--warm-50)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersSection />}
      {tab === 'templates' && <TemplatesSection />}
      {tab === 'coverage' && <CoverageSection />}
    </div>
  )
}

// ─── Users ───────────────────────────────────────────────────────────────────

function UsersSection() {
  const { data: profiles = [], isLoading } = useProfiles()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Profile>>({})
  const supabase = createClient()
  const qc = useQueryClient()

  function startEdit(profile: Profile) {
    setEditingId(profile.id)
    setEditForm({
      full_name: profile.full_name,
      role: profile.role,
      phone: profile.phone,
      calendar_link: profile.calendar_link,
      service_regions: profile.service_regions,
      active: profile.active,
    })
  }

  async function saveEdit() {
    if (!editingId) return
    const { error } = await supabase.from('profiles').update(editForm).eq('id', editingId)
    if (error) { toast.error(error.message); return }
    toast.success('User updated')
    qc.invalidateQueries({ queryKey: ['profiles'] })
    setEditingId(null)
  }

  const roleConfig: Record<string, { bg: string; text: string; icon: string }> = {
    admin: { bg: 'bg-purple-50 ring-1 ring-purple-200', text: 'text-purple-700', icon: '👑' },
    sales: { bg: 'bg-blue-50 ring-1 ring-blue-200', text: 'text-blue-700', icon: '📞' },
    operations: { bg: 'bg-amber-50 ring-1 ring-amber-200', text: 'text-amber-700', icon: '⚙️' },
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-[var(--warm-50)] rounded-2xl shimmer" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {profiles.map((profile) => {
        const rc = roleConfig[profile.role] ?? roleConfig.sales

        return editingId === profile.id ? (
          <div key={profile.id} className="bg-white rounded-2xl border border-[var(--green-200)] shadow-sm p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Name</label>
                <input value={editForm.full_name ?? ''} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Role</label>
                <select value={editForm.role ?? 'sales'} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:outline-none">
                  <option value="admin">Admin</option>
                  <option value="sales">Sales</option>
                  <option value="operations">Operations</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Phone</label>
                <input value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Calendar Link</label>
                <input value={editForm.calendar_link ?? ''} onChange={(e) => setEditForm({ ...editForm, calendar_link: e.target.value })} placeholder="https://calendly.com/..." className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Service Regions</label>
              <input
                value={(editForm.service_regions ?? []).join(', ')}
                onChange={(e) => setEditForm({ ...editForm, service_regions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="WA, CW, CH, M, L"
                className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-[var(--warm-700)]">
                <input type="checkbox" checked={editForm.active ?? true} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} className="rounded" />
                Active
              </label>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)] rounded-lg hover:bg-[var(--warm-50)]">
                  <X size={12} /> Cancel
                </button>
                <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[var(--green-700)] rounded-lg hover:bg-[var(--green-900)] active:scale-[0.98]">
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div key={profile.id} className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-sm font-bold text-[var(--green-700)]">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  {profile.active && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--warm-800)]">{profile.full_name}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${rc.bg} ${rc.text}`}>
                    {profile.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => startEdit(profile)}
                className="p-2 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Edit3 size={14} />
              </button>
            </div>

            <div className="space-y-1.5">
              {profile.phone && (
                <p className="text-xs text-[var(--warm-500)]">{profile.phone}</p>
              )}
              {profile.service_regions?.length ? (
                <div className="flex items-center gap-1 flex-wrap">
                  <MapPin size={10} className="text-[var(--warm-300)]" />
                  {profile.service_regions.map((r) => (
                    <span key={r} className="text-[10px] px-1.5 py-0.5 bg-[var(--warm-50)] text-[var(--warm-500)] rounded-md font-medium">
                      {r}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="text-[10px] text-[var(--warm-300)]">
                {profile.active_opportunities} active opportunities
              </p>
            </div>

            {!profile.active && (
              <div className="mt-2 px-2 py-1 bg-red-50 rounded-lg text-[10px] text-red-500 font-medium inline-block">
                Inactive
              </div>
            )}
          </div>
        )
      })}

      {profiles.length === 0 && (
        <div className="col-span-2 p-12 text-center text-sm text-[var(--warm-400)]">
          No users found. Create users in Supabase Auth and add profile rows.
        </div>
      )}
    </div>
  )
}

// ─── Templates ───────────────────────────────────────────────────────────────

function TemplatesSection() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  function copyBody(id: string, body: string) {
    navigator.clipboard.writeText(body)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const channelIcons: Record<string, string> = {
    email: '✉️',
    sms: '💬',
    whatsapp: '📱',
  }

  return (
    <div className="space-y-3">
      {DEFAULT_TEMPLATES.map((template) => (
        <div key={template.id} className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === template.id ? null : template.id)}
            className="w-full flex items-center justify-between text-left p-5 hover:bg-[var(--warm-50)]/50 transition-colors"
          >
            <div>
              <span className="text-sm font-semibold text-[var(--warm-800)]">{template.name}</span>
              <div className="flex items-center gap-2 mt-1">
                {template.channels.map((ch) => (
                  <span key={ch} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warm-50)] text-[var(--warm-500)] font-medium ring-1 ring-[var(--warm-100)]">
                    {channelIcons[ch] ?? ''} {ch}
                  </span>
                ))}
              </div>
            </div>
            {expanded === template.id ? <ChevronUp size={14} className="text-[var(--warm-400)]" /> : <ChevronDown size={14} className="text-[var(--warm-400)]" />}
          </button>

          {expanded === template.id && (
            <div className="px-5 pb-5 pt-0 border-t border-[var(--warm-50)] animate-fade-in">
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Subject</label>
                  <div className="px-3 py-2 text-sm bg-[var(--warm-50)] rounded-xl text-[var(--warm-700)]">
                    {template.subject}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider">Body</label>
                    <button
                      onClick={() => copyBody(template.id, template.body)}
                      className="flex items-center gap-1 text-[10px] text-[var(--warm-400)] hover:text-[var(--green-600)] transition-colors"
                    >
                      {copied === template.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                    </button>
                  </div>
                  <pre className="px-3 py-2.5 text-xs bg-[var(--warm-50)] rounded-xl text-[var(--warm-700)] whitespace-pre-wrap font-body leading-relaxed">
                    {template.body}
                  </pre>
                </div>
                <p className="text-[10px] text-[var(--warm-300)]">
                  Placeholders: {'{{name}}, {{first_name}}, {{owner_name}}, {{date}}, {{time}}, {{project_type}}, {{amount}}, {{booking_link}}, {{payment_link}}'}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Coverage ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: RegionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'inactive', label: 'Inactive' },
]

function CoverageSection() {
  const { data: regions = [], isLoading } = useServiceRegions()
  const updateRegion = useUpdateServiceRegion()
  const [filter, setFilter] = useState<RegionStatus | 'all'>('all')

  const filtered = filter === 'all' ? regions : regions.filter((r) => r.status === filter)

  const counts = {
    active: regions.filter((r) => r.status === 'active').length,
    coming_soon: regions.filter((r) => r.status === 'coming_soon').length,
    inactive: regions.filter((r) => r.status === 'inactive').length,
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-[var(--warm-50)] rounded-xl shimmer" />)}
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-[var(--warm-400)] mb-4">
        Manage which regions appear on the public coverage map. Changes take effect within a few minutes.
      </p>

      {/* Filter buttons */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'all' ? 'bg-[var(--green-600)] text-white' : 'text-[var(--warm-500)] hover:bg-[var(--warm-50)]'
          }`}
        >
          All ({regions.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'active' ? 'bg-[var(--orange-500)] text-white' : 'text-[var(--warm-500)] hover:bg-[var(--warm-50)]'
          }`}
        >
          Active ({counts.active})
        </button>
        <button
          onClick={() => setFilter('coming_soon')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'coming_soon' ? 'bg-[var(--warm-700)] text-white' : 'text-[var(--warm-500)] hover:bg-[var(--warm-50)]'
          }`}
        >
          Coming Soon ({counts.coming_soon})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'inactive' ? 'bg-[var(--warm-300)] text-white' : 'text-[var(--warm-500)] hover:bg-[var(--warm-50)]'
          }`}
        >
          Inactive ({counts.inactive})
        </button>
      </div>

      {/* Region list */}
      <div className="space-y-2">
        {filtered.map((region) => (
          <div
            key={region.id}
            className="flex items-center justify-between bg-white rounded-xl border border-[var(--warm-100)] px-4 py-3 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${
                region.status === 'active' ? 'bg-[var(--orange-400)]' :
                region.status === 'coming_soon' ? 'bg-[var(--warm-700)]' : 'bg-[var(--warm-200)]'
              }`} />
              <span className="text-sm font-medium text-[var(--warm-800)]">{region.name}</span>
            </div>

            <select
              value={region.status}
              onChange={(e) => updateRegion.mutate({ id: region.id, status: e.target.value as RegionStatus })}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] text-[var(--warm-700)] focus:outline-none focus:border-[var(--green-500)] cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-8 text-center text-sm text-[var(--warm-400)]">
          No regions match this filter.
        </div>
      )}
    </div>
  )
}

