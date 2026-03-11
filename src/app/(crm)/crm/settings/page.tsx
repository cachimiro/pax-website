'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfiles, useServiceRegions, useUpdateServiceRegion } from '@/lib/crm/hooks'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, Mail, MapPin, Edit3, Save, X, ChevronDown, ChevronUp, Copy, Check, Globe, Brain, Link2, AlertTriangle, Loader2, Plus, Trash2, Clock, Zap, PenTool, Wrench, Send, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignature, useUpdateSignature, useChannelStatus } from '@/lib/crm/hooks'
import type { SignatureConfig } from '@/lib/crm/hooks'
import { useAIPreferences, AI_PREF_DEFAULTS } from '@/lib/crm/ai-preferences'
import { useGoogleStatus, useGoogleConnect, useGoogleDisconnect, useGoogleToggle } from '@/lib/crm/hooks'
import type { Profile, UserRole, RegionStatus, AIPreferences } from '@/lib/crm/types'
import { formatDistanceToNow } from 'date-fns'
import TemplatesSection from '@/components/crm/settings/TemplatesSection'
import FittersSection from '@/components/crm/settings/FittersSection'

type SettingsTab = 'users' | 'templates' | 'coverage' | 'ai' | 'signature' | 'fitters' | 'integrations'

const BASE_TABS = [
  { key: 'users' as const, label: 'Users', icon: <Users size={14} /> },
  { key: 'templates' as const, label: 'Templates', icon: <Mail size={14} /> },
  { key: 'coverage' as const, label: 'Coverage', icon: <Globe size={14} /> },
  { key: 'ai' as const, label: 'AI', icon: <Brain size={14} /> },
  { key: 'signature' as const, label: 'Signature', icon: <PenTool size={14} /> },
  { key: 'fitters' as const, label: 'Fitters', icon: <Wrench size={14} /> },
]

export default function SettingsPage() {
  const { data: profiles = [] } = useProfiles()
  const supabaseClient = createClient()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const currentProfile = profiles.find((p) => p.id === userId)
  const isAdmin = currentProfile?.role === 'admin'

  const SETTINGS_TABS = [
    ...BASE_TABS,
    ...(isAdmin ? [{ key: 'integrations' as const, label: 'Integrations', icon: <Link2 size={14} /> }] : []),
  ]

  // Handle URL params from OAuth callback
  const initialTab = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('tab') as SettingsTab | null
    : null

  const [tab, setTab] = useState<SettingsTab>(initialTab && SETTINGS_TABS.some(t => t.key === initialTab) ? initialTab : 'users')
  const [underline, setUnderline] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const el = tabRefs.current[tab]
    if (el) {
      setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [tab, isAdmin])

  // Show toast for QuickBooks OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qbConnected = params.get('qb_connected')
    const qbError = params.get('qb_error')
    if (qbConnected === '1') {
      toast.success('QuickBooks connected')
      window.history.replaceState({}, '', '/crm/settings?tab=integrations')
    } else if (qbError) {
      toast.error(`QuickBooks connection failed: ${qbError.replace(/_/g, ' ')}`)
      window.history.replaceState({}, '', '/crm/settings?tab=integrations')
    }
  }, [])

  // Show toast for Google OAuth result
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const googleResult = params.get('google')
    if (googleResult === 'connected') {
      toast.success('Google account connected')
      window.history.replaceState({}, '', '/crm/settings?tab=integrations')
    } else if (googleResult === 'error') {
      const reason = params.get('reason') ?? 'unknown'
      toast.error(`Google connection failed: ${reason.replace(/_/g, ' ')}`)
      window.history.replaceState({}, '', '/crm/settings?tab=integrations')
    }
  }, [])

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)] mb-6">Settings</h1>

      {/* Tabs with sliding underline */}
      <div className="relative flex items-center gap-1 mb-6 border-b border-[var(--warm-100)] pb-px">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.key}
            ref={(el) => { tabRefs.current[t.key] = el }}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors relative ${
              tab === t.key
                ? 'text-[var(--green-700)]'
                : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        {/* Sliding underline */}
        <motion.div
          className="absolute bottom-0 h-[2px] bg-[var(--green-600)] rounded-full"
          animate={{ left: underline.left, width: underline.width }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      </div>

      {/* Tab content with transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'users' && <UsersSection />}
          {tab === 'templates' && <TemplatesSection />}
          {tab === 'coverage' && <CoverageSection />}
          {tab === 'ai' && <AISection />}
          {tab === 'signature' && <SignatureSection />}
          {tab === 'fitters' && <FittersSection />}
          {tab === 'integrations' && isAdmin && <IntegrationsSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Users ───────────────────────────────────────────────────────────────────

function UsersSection() {
  const { data: profiles = [], isLoading } = useProfiles()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Profile>>({})
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'sales' | 'operations' | 'admin'>('sales')
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const supabase = createClient()
  const qc = useQueryClient()

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast.error('Name and email are required')
      return
    }
    setInviting(true)
    try {
      const res = await fetch('/api/crm/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), full_name: inviteName.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invite failed')
      toast.success(`Invite sent to ${inviteEmail}`)
      setShowInvite(false)
      setInviteEmail('')
      setInviteName('')
      qc.invalidateQueries({ queryKey: ['profiles'] })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Deactivate this user? They will lose CRM access.')) return
    setRemovingId(userId)
    try {
      const res = await fetch(`/api/crm/admin/users/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      toast.success('User deactivated')
      qc.invalidateQueries({ queryKey: ['profiles'] })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setRemovingId(null)
    }
  }

  function startEdit(profile: Profile) {
    setEditingId(profile.id)
    setEditForm({
      full_name: profile.full_name,
      role: profile.role,
      phone: profile.phone,
      calendar_link: profile.calendar_link,
      service_regions: profile.service_regions,
      active: profile.active,
      color: profile.color ?? '#6366f1',
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

  const PALETTE = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#f97316','#06b6d4']

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--warm-400)] leading-relaxed max-w-lg">
          Team members who can log in to the CRM. <strong>Admin</strong> = full access + settings. <strong>Sales</strong> = own leads and pipeline only. <strong>Operations</strong> = fittings, sign-off, and completion.
        </p>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[var(--green-700)] rounded-xl hover:bg-[var(--green-800)] transition-colors flex-shrink-0 ml-4"
        >
          <UserPlus size={13} /> Invite user
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-[var(--green-50)] border border-[var(--green-200)] rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-[var(--green-800)]">Invite a new team member</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[var(--warm-500)] mb-1 uppercase tracking-wider">Full name</label>
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Sarah Mitchell"
                className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--warm-500)] mb-1 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="sarah@paxbespoke.co.uk"
                className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--warm-500)] mb-1 uppercase tracking-wider">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:outline-none bg-white"
              >
                <option value="sales">Sales</option>
                <option value="operations">Operations</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowInvite(false)} className="px-3 py-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)] rounded-lg hover:bg-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[var(--green-700)] rounded-xl hover:bg-[var(--green-800)] disabled:opacity-50 transition-colors"
            >
              {inviting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send invite
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {profiles.map((profile) => {
        const rc = roleConfig[profile.role] ?? roleConfig.sales
        const userColor = profile.color ?? '#6366f1'

        return editingId === profile.id ? (
          <div key={profile.id} className="bg-white rounded-2xl border-2 shadow-sm p-5 space-y-3" style={{ borderColor: userColor }}>
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
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Colour</label>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditForm({ ...editForm, color: c })}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: editForm.color === c ? '#000' : 'transparent',
                      }}
                    />
                  ))}
                </div>
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
          <div
            key={profile.id}
            className="bg-white rounded-2xl border-l-4 border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 hover:shadow-md transition-all group"
            style={{ borderLeftColor: userColor }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: userColor }}
                  >
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  {profile.active && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--warm-800)]">{profile.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${rc.bg} ${rc.text}`}>
                      {profile.role}
                    </span>
                    {/* Google Calendar status */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      profile.google_calendar_connected
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-[var(--warm-50)] text-[var(--warm-400)]'
                    }`}>
                      {profile.google_calendar_connected ? '● Calendar' : '○ No calendar'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(profile)}
                  className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-600)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleRemove(profile.id)}
                  disabled={removingId === profile.id}
                  className="p-1.5 text-[var(--warm-300)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                >
                  {removingId === profile.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {profile.phone && (
                <p className="text-xs text-[var(--warm-500)]">{profile.phone}</p>
              )}
              {profile.google_email && (
                <p className="text-[10px] text-[var(--warm-400)]">{profile.google_email}</p>
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
                {profile.active_opportunities} active {profile.active_opportunities === 1 ? 'opportunity' : 'opportunities'}
              </p>
            </div>

            {!profile.active && (
              <div className="mt-2 px-2 py-1 bg-red-50 rounded-lg text-[10px] text-red-500 font-medium inline-block">
                Inactive
              </div>
            )}
            {profile.onboarding_complete === false && (
              <div className="mt-2 px-2 py-1 bg-amber-50 rounded-lg text-[10px] text-amber-600 font-medium inline-block">
                Awaiting onboarding
              </div>
            )}
          </div>
        )
      })}

      {profiles.length === 0 && (
        <div className="col-span-2 p-12 text-center text-sm text-[var(--warm-400)]">
          No users found.
        </div>
      )}
      </div>
    </div>
  )
}

// ─── Templates ── extracted to @/components/crm/settings/TemplatesSection

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

// ─── AI Preferences ──────────────────────────────────────────────────────────

function AISection() {
  const { prefs, update, isUpdating } = useAIPreferences()
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.resolve(
      supabase
        .from('ai_insights')
        .select('key, value, computed_at')
        .in('key', ['suggestion_acceptance', 'pipeline_snapshot', 'stage_conversion'])
    ).then(({ data }) => {
      if (data) {
        const map: Record<string, unknown> = {}
        data.forEach((row) => { map[row.key] = row.value })
        setInsights(map)
      }
      setInsightsLoading(false)
    }).catch(() => setInsightsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={16} className="text-[var(--green-600)]" />
          <h2 className="text-sm font-semibold text-[var(--warm-800)]">AI Preferences</h2>
        </div>
        <p className="text-xs text-[var(--warm-400)] mb-6">Control how AI features behave across the CRM. Changes apply immediately.</p>

        <div className="space-y-5">
          <ToggleRow
            label="Smart Suggestions"
            description="Show contextual next-action suggestions on leads and pipeline"
            checked={prefs.suggestions_enabled}
            onChange={(v) => update({ suggestions_enabled: v })}
          />
          <ToggleRow
            label="AI Message Composer"
            description="Enable GPT-powered message drafting when composing emails and messages"
            checked={prefs.compose_enabled}
            onChange={(v) => update({ compose_enabled: v })}
          />
          <ToggleRow
            label="Daily Briefing"
            description="Show an AI-generated summary of your pipeline on the dashboard"
            checked={prefs.briefing_enabled}
            onChange={(v) => update({ briefing_enabled: v })}
          />
          <ToggleRow
            label="Pipeline Health Check"
            description="Show a weekly AI analysis of pipeline health, bottlenecks, and win/loss trends"
            checked={prefs.health_check_enabled}
            onChange={(v) => update({ health_check_enabled: v })}
          />
          <ToggleRow
            label="Auto-snooze Weekends"
            description="Don't flag leads as stale over weekends (uses business-day counting)"
            checked={prefs.snooze_weekends}
            onChange={(v) => update({ snooze_weekends: v })}
          />
          <ToggleRow
            label="AI Auto-tasks"
            description="Automatically create supplementary tasks when leads change stage"
            checked={prefs.auto_task_enabled ?? true}
            onChange={(v) => update({ auto_task_enabled: v })}
          />
          <ToggleRow
            label="Evening Digest"
            description="Show an end-of-day summary with tomorrow's prep after 16:00"
            checked={prefs.evening_digest_enabled ?? true}
            onChange={(v) => update({ evening_digest_enabled: v })}
          />
          <ToggleRow
            label="Stale Lead Nudges"
            description="Surface notifications when leads have had no activity beyond their expected stage duration"
            checked={prefs.stale_nudge_enabled ?? true}
            onChange={(v) => update({ stale_nudge_enabled: v })}
          />

          <div className="border-t border-[var(--warm-50)] pt-5" />

          <SelectRow
            label="Notification Level"
            description="How aggressively AI nudges you about leads needing attention"
            value={prefs.notification_level}
            options={[
              { value: 'quiet', label: 'Quiet', desc: 'In-page indicators only' },
              { value: 'normal', label: 'Normal', desc: 'In-page + badge count' },
              { value: 'active', label: 'Active', desc: 'In-page + badge + browser notifications' },
            ]}
            onChange={(v) => update({ notification_level: v as AIPreferences['notification_level'] })}
          />
          <SelectRow
            label="Default Compose Tone"
            description="The default writing style when AI drafts messages"
            value={prefs.compose_tone}
            options={[
              { value: 'formal', label: 'Formal', desc: 'Professional and structured' },
              { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
              { value: 'brief', label: 'Brief', desc: 'Short and to the point' },
            ]}
            onChange={(v) => update({ compose_tone: v as AIPreferences['compose_tone'] })}
          />
        </div>
      </div>

      {/* AI Insights stats — populated nightly by /api/crm/ai/recompute-insights */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={15} className="text-[var(--green-600)]" />
          <h2 className="text-sm font-semibold text-[var(--warm-800)]">AI Performance Insights</h2>
        </div>
        <p className="text-xs text-[var(--warm-400)] mb-5">Aggregated metrics from the AI memory layer. Updated nightly.</p>

        {insightsLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="animate-spin text-[var(--warm-300)]" />
            <span className="text-xs text-[var(--warm-400)]">Loading insights...</span>
          </div>
        ) : !insights || Object.keys(insights).length === 0 ? (
          <p className="text-xs text-[var(--warm-400)]">No insights yet — data populates after the first nightly recompute.</p>
        ) : (
          <div className="space-y-4">
            {/* Suggestion acceptance */}
            {insights.suggestion_acceptance != null && (
              <SuggestionAcceptanceCard data={insights.suggestion_acceptance as SuggestionAcceptanceData} />
            )}
            {/* Pipeline snapshot */}
            {insights.pipeline_snapshot != null && (
              <PipelineSnapshotCard data={insights.pipeline_snapshot as PipelineSnapshotData} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AI Insights sub-components ──────────────────────────────────────────────

interface SuggestionAcceptanceData { accepted: number; dismissed: number; pending: number; acceptance_rate_pct: number }
function SuggestionAcceptanceCard({ data: sa }: { data: SuggestionAcceptanceData }) {
  return (
    <div className="bg-[var(--warm-50)] rounded-xl p-4">
      <p className="text-[11px] font-semibold text-[var(--warm-600)] uppercase tracking-wider mb-3">Suggestion Feedback</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--green-600)] font-heading">{sa.acceptance_rate_pct ?? 0}%</p>
          <p className="text-[10px] text-[var(--warm-400)]">Acceptance rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--warm-700)] font-heading">{sa.accepted ?? 0}</p>
          <p className="text-[10px] text-[var(--warm-400)]">Accepted</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--warm-400)] font-heading">{sa.dismissed ?? 0}</p>
          <p className="text-[10px] text-[var(--warm-400)]">Dismissed</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-[var(--warm-100)] rounded-full overflow-hidden">
        <div className="h-full bg-[var(--green-500)] rounded-full transition-all" style={{ width: `${Math.min(sa.acceptance_rate_pct ?? 0, 100)}%` }} />
      </div>
    </div>
  )
}

interface PipelineSnapshotData { active_deals: number; total_value: number; avg_days_in_pipeline: number; stale_count: number }
function PipelineSnapshotCard({ data: ps }: { data: PipelineSnapshotData }) {
  return (
    <div className="bg-[var(--warm-50)] rounded-xl p-4">
      <p className="text-[11px] font-semibold text-[var(--warm-600)] uppercase tracking-wider mb-3">Pipeline Snapshot</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--warm-800)] font-heading">{ps.active_deals ?? 0}</p>
          <p className="text-[10px] text-[var(--warm-400)]">Active deals</p>
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--warm-800)] font-heading">
            {ps.total_value ? `£${Number(ps.total_value).toLocaleString('en-GB')}` : '—'}
          </p>
          <p className="text-[10px] text-[var(--warm-400)]">Pipeline value</p>
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--warm-800)] font-heading">{ps.avg_days_in_pipeline ?? 0}d</p>
          <p className="text-[10px] text-[var(--warm-400)]">Avg days in pipeline</p>
        </div>
        <div>
          <p className={`text-sm font-bold font-heading ${(ps.stale_count ?? 0) > 0 ? 'text-amber-600' : 'text-[var(--warm-800)]'}`}>
            {ps.stale_count ?? 0}
          </p>
          <p className="text-[10px] text-[var(--warm-400)]">Stale leads</p>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[var(--warm-800)]">{label}</p>
        <p className="text-xs text-[var(--warm-400)] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
          checked ? 'bg-[var(--green-600)]' : 'bg-[var(--warm-200)]'
        }`}
      >
        <motion.div
          className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  )
}

function SelectRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string
  description: string
  value: string
  options: { value: string; label: string; desc: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--warm-800)]">{label}</p>
      <p className="text-xs text-[var(--warm-400)] mt-0.5 mb-3">{description}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
              value === opt.value
                ? 'border-[var(--green-500)] bg-[var(--green-50)] ring-1 ring-[var(--green-500)]/20'
                : 'border-[var(--warm-100)] bg-white hover:border-[var(--warm-200)]'
            }`}
          >
            <p className={`text-xs font-semibold ${value === opt.value ? 'text-[var(--green-700)]' : 'text-[var(--warm-700)]'}`}>
              {opt.label}
            </p>
            <p className="text-[10px] text-[var(--warm-400)] mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Email Signature ─────────────────────────────────────────────────────────

function SignatureSection() {
  const { data: signature, isLoading } = useSignature()
  const updateSig = useUpdateSignature()
  const [form, setForm] = useState<SignatureConfig | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (signature && !form) {
      setForm(signature)
    }
  }, [signature, form])

  if (isLoading || !form) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--warm-400)] py-8">
        <Loader2 size={14} className="animate-spin" /> Loading signature...
      </div>
    )
  }

  const update = (field: keyof SignatureConfig, value: string) => {
    setForm({ ...form, [field]: value })
    setDirty(true)
  }

  const save = () => {
    updateSig.mutate(form, {
      onSuccess: () => setDirty(false),
    })
  }

  const fields: { key: keyof SignatureConfig; label: string; placeholder: string }[] = [
    { key: 'name', label: 'Sender Name', placeholder: 'e.g. John Smith' },
    { key: 'role', label: 'Role / Title', placeholder: 'e.g. Design Consultant' },
    { key: 'phone', label: 'Phone', placeholder: 'e.g. +44 7000 000000' },
    { key: 'email', label: 'Email', placeholder: 'e.g. john@paxbespoke.uk' },
    { key: 'tagline', label: 'Company Tagline', placeholder: 'e.g. Premium Bespoke Wardrobes' },
    { key: 'website_url', label: 'Website URL', placeholder: 'https://paxbespoke.uk' },
    { key: 'logo_url', label: 'Logo URL', placeholder: 'https://paxbespoke.uk/images/logo-full.png' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--warm-800)] mb-1">Email Signature</h3>
        <p className="text-xs text-[var(--warm-400)]">
          Customize the signature that appears at the bottom of all outgoing emails.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-[var(--warm-600)] mb-1">{f.label}</label>
              <input
                type="text"
                value={form[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl bg-white text-[var(--warm-800)] placeholder:text-[var(--warm-300)] focus:outline-none focus:ring-2 focus:ring-[#0E7A59]/20 focus:border-[#0E7A59]"
              />
            </div>
          ))}

          <button
            onClick={save}
            disabled={!dirty || updateSig.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-[#0E7A59] text-white hover:bg-[#0C6B4E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {updateSig.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Signature
          </button>
        </div>

        {/* Live Preview */}
        <div>
          <p className="text-xs font-medium text-[var(--warm-600)] mb-2">Preview</p>
          <div className="border border-[var(--warm-100)] rounded-2xl bg-[#FAFAF8] p-4">
            {/* Mini email preview */}
            <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5 mb-4">
              <p className="text-sm text-[var(--warm-600)] leading-relaxed mb-3">
                Hi Sarah, thank you for your enquiry about a bespoke wardrobe. I&apos;d love to discuss your project...
              </p>
              <p className="text-sm text-[var(--warm-600)] leading-relaxed">
                Looking forward to speaking with you soon.
              </p>
            </div>

            {/* Signature preview */}
            <div className="border-l-[3px] border-[#0E7A59] pl-3.5 space-y-0.5">
              <p className="text-sm font-semibold text-[var(--warm-900)]">{form.name || 'PaxBespoke'}</p>
              {form.role && (
                <p className="text-xs text-[var(--warm-500)]">{form.role} · PaxBespoke</p>
              )}
              {form.phone && (
                <p className="text-xs text-[var(--warm-500)]">{form.phone}</p>
              )}
              {form.email && (
                <p className="text-xs text-[#0E7A59]">{form.email}</p>
              )}
            </div>

            {/* Footer preview */}
            <div className="mt-4 pt-3 border-t border-[var(--warm-100)]">
              <p className="text-[10px] text-[var(--warm-300)]">
                PaxBespoke · {form.tagline || 'Premium Bespoke Wardrobes'}
              </p>
              <p className="text-[10px] text-[var(--warm-300)]">
                {(form.website_url || 'https://paxbespoke.uk').replace('https://', '')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Integrations (Admin-only) ───────────────────────────────────────────────

function ChannelStatusPanel() {
  const { data: channels, isLoading } = useChannelStatus()

  if (isLoading || !channels) return null

  const items = [
    { label: 'Email', status: channels.email.configured, detail: channels.email.detail, color: 'blue' },
    { label: 'SMS', status: channels.sms.configured, detail: channels.sms.detail, color: 'amber' },
    { label: 'WhatsApp', status: channels.whatsapp.configured, detail: channels.whatsapp.detail, color: 'emerald' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 mt-4">
      <h3 className="text-xs font-semibold text-[var(--warm-700)] mb-3">Messaging Channels</h3>
      <div className="space-y-2.5">
        {items.map((ch) => (
          <div key={ch.label} className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${ch.status ? 'bg-emerald-500' : 'bg-red-400'}`} />
            <div className="min-w-0">
              <span className="text-xs font-medium text-[var(--warm-700)]">{ch.label}</span>
              <span className="text-[10px] text-[var(--warm-400)] ml-2">{ch.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IntegrationsSection() {
  const { data: status, isLoading } = useGoogleStatus()
  const connect = useGoogleConnect()
  const disconnect = useGoogleDisconnect()
  const toggle = useGoogleToggle()
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-[var(--warm-400)]" />
          <span className="text-xs text-[var(--warm-400)]">Loading integration status...</span>
        </div>
      </div>
    )
  }

  // Disconnected state
  if (!status?.connected) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--warm-800)]">Google Workspace</h2>
            <p className="text-[10px] text-[var(--warm-400)]">Email, Calendar & Tracking</p>
          </div>
        </div>

        {/* Feature-impact callout — shows what is currently unavailable */}
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
          <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-amber-700 mb-1">These features are unavailable until you connect</p>
            <ul className="space-y-0.5">
              {[
                'Sending emails from your own address',
                'Receiving lead replies in the CRM',
                'Google Meet links on bookings',
                'Calendar sync for appointments',
                'Email open & click tracking',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-[11px] text-amber-600">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-[var(--warm-500)] leading-relaxed mb-5">
          Connect your Google account to unlock branded email sending, inbox sync, calendar integration, and engagement tracking.
        </p>

        <div className="space-y-2.5 mb-6">
          {[
            { icon: '✉', text: 'Send branded emails from your own address' },
            { icon: '↩', text: 'Auto-sync lead replies into the CRM' },
            { icon: '📅', text: 'Calendar events for every booking' },
            { icon: '📊', text: 'Email open and click tracking' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-sm w-5 text-center">{item.icon}</span>
              <span className="text-xs text-[var(--warm-600)]">{item.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => connect.mutate()}
          disabled={connect.isPending}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white border-2 border-[var(--warm-100)] hover:border-[var(--warm-200)] hover:shadow-sm text-sm font-medium text-[var(--warm-700)] transition-all"
        >
          {connect.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          )}
          {connect.isPending ? 'Connecting...' : 'Connect Google Account'}
        </button>

        <p className="text-[10px] text-[var(--warm-300)] text-center mt-3">
          Works with Gmail and Google Workspace. Only admins can connect or disconnect.
        </p>

        <ChannelStatusPanel />
      </div>
    )
  }

  // Connected state
  return (
    <div className="space-y-4">
      {/* Re-auth warning */}
      {status.needs_reauth && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-amber-700">Re-authentication required</p>
            <p className="text-[10px] text-amber-600">Your Google token has expired. Reconnect to resume email and calendar sync.</p>
          </div>
          <button
            onClick={() => connect.mutate()}
            className="px-3 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors shrink-0"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Email card */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail size={14} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--warm-800)]">Email</h3>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${status.email_active ? 'bg-emerald-500' : 'bg-[var(--warm-300)]'}`} />
                <span className="text-[10px] text-[var(--warm-400)]">
                  {status.email_active ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => toggle.mutate({ email_active: !status.email_active })}
            className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
              status.email_active ? 'bg-[var(--green-600)]' : 'bg-[var(--warm-200)]'
            }`}
          >
            <motion.div
              className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
              animate={{ left: status.email_active ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <div className="px-3 py-2.5 rounded-xl bg-[var(--warm-50)] mb-3">
          <p className="text-xs font-medium text-[var(--warm-800)]">{status.email}</p>
          <p className="text-[10px] text-[var(--warm-400)] mt-0.5">
            All outreach sends from this address
          </p>
        </div>

        {status.stats && (
          <div className="flex gap-3 mb-3">
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-[var(--warm-800)]">{status.stats.sent_this_week}</p>
              <p className="text-[10px] text-[var(--warm-400)]">Sent</p>
            </div>
            <div className="w-px bg-[var(--warm-100)]" />
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-[var(--warm-800)]">{status.stats.opens_this_week}</p>
              <p className="text-[10px] text-[var(--warm-400)]">Opened</p>
            </div>
            <div className="w-px bg-[var(--warm-100)]" />
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-[var(--warm-800)]">{status.stats.clicks_this_week}</p>
              <p className="text-[10px] text-[var(--warm-400)]">Clicked</p>
            </div>
          </div>
        )}

        <p className="text-[10px] text-[var(--warm-300)]">
          Connected {status.connected_at ? formatDistanceToNow(new Date(status.connected_at), { addSuffix: true }) : ''} by {status.connected_by_name}
        </p>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--warm-800)]">Calendar</h3>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${status.calendar_active ? 'bg-emerald-500' : 'bg-[var(--warm-300)]'}`} />
                <span className="text-[10px] text-[var(--warm-400)]">
                  {status.calendar_active ? 'Synced' : 'Paused'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => toggle.mutate({ calendar_active: !status.calendar_active })}
            className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
              status.calendar_active ? 'bg-[var(--green-600)]' : 'bg-[var(--warm-200)]'
            }`}
          >
            <motion.div
              className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
              animate={{ left: status.calendar_active ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <p className="text-xs text-[var(--warm-500)] leading-relaxed">
          Bookings automatically create Google Calendar events. Leads receive calendar invites.
        </p>

        {status.calendar_active && status.calendar_stats && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/50">
            <span className="text-sm font-bold text-[var(--warm-800)]">{status.calendar_stats.synced_upcoming}</span>
            <span className="text-[10px] text-[var(--warm-400)]">upcoming synced events</span>
          </div>
        )}
      </div>

      {/* Disconnect */}
      <div className="pt-2">
        {confirmDisconnect ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <p className="flex-1 text-xs text-red-600">
              This will revert to the default email sender. Existing emails and events are not deleted.
            </p>
            <button
              onClick={() => { disconnect.mutate(); setConfirmDisconnect(false) }}
              disabled={disconnect.isPending}
              className="px-3 py-1.5 text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shrink-0"
            >
              {disconnect.isPending ? 'Disconnecting...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmDisconnect(false)}
              className="px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="text-[11px] text-[var(--warm-400)] hover:text-red-500 transition-colors"
          >
            Disconnect Google Account
          </button>
        )}
      </div>

      <ChannelStatusPanel />
      <QuickBooksSection />
    </div>
  )
}

// ─── QuickBooks Section ───────────────────────────────────────────────────────

function QuickBooksSection() {
  const [status, setStatus] = useState<{
    connected: boolean
    has_credentials: boolean
    company_name?: string
    environment?: string
    connected_at?: string
    token_expired?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetch('/api/crm/quickbooks/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false, has_credentials: false }))
      .finally(() => setLoading(false))
  }, [])

  async function connect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/crm/quickbooks/auth-url')
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      window.location.href = data.url
    } catch {
      toast.error('Failed to start QuickBooks connection')
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/crm/quickbooks/status', { method: 'DELETE' })
      setStatus((s) => s ? { ...s, connected: false } : s)
      toast.success('QuickBooks disconnected')
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-5 mt-4">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-[var(--warm-400)]" />
          <span className="text-xs text-[var(--warm-400)]">Loading QuickBooks status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 mt-4">
      <div className="flex items-center gap-2.5 mb-3">
        {/* QuickBooks logo mark */}
        <div className="w-9 h-9 rounded-xl bg-[#2CA01C]/10 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#2CA01C"/>
            <path d="M8 16a8 8 0 1 0 16 0 8 8 0 0 0-16 0zm8-5.5v2.25H13.5a3.25 3.25 0 0 0 0 6.5H16v2.25h-2.5a5.5 5.5 0 0 1 0-11H16zm0 2.25h2.5a3.25 3.25 0 0 1 0 6.5H16v-2.25h2.5a1 1 0 0 0 0-2H16v-2.25z" fill="white"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--warm-800)]">QuickBooks Online</h3>
          <p className="text-[10px] text-[var(--warm-400)]">Invoicing &amp; payments</p>
        </div>
        {status?.connected && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Connected
            {status.environment === 'sandbox' && ' (sandbox)'}
          </span>
        )}
      </div>

      {!status?.has_credentials && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4 text-xs text-amber-800">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Credentials not configured.</strong> Add <code className="bg-amber-100 px-1 rounded">QB_CLIENT_ID</code> and <code className="bg-amber-100 px-1 rounded">QB_CLIENT_SECRET</code> to your environment variables, then reconnect.
          </span>
        </div>
      )}

      {status?.connected ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {status.company_name && (
              <div>
                <p className="text-[10px] text-[var(--warm-400)] uppercase tracking-wide">Company</p>
                <p className="font-medium text-[var(--warm-800)] mt-0.5">{status.company_name}</p>
              </div>
            )}
            {status.connected_at && (
              <div>
                <p className="text-[10px] text-[var(--warm-400)] uppercase tracking-wide">Connected</p>
                <p className="font-medium text-[var(--warm-800)] mt-0.5">
                  {new Date(status.connected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {status.token_expired && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
              Token expired — reconnect to resume invoice creation.
            </div>
          )}

          <div className="space-y-2 text-xs text-[var(--warm-600)]">
            {[
              'Invoices created automatically when a customer agrees to a quote',
              'Invoice sent to customer via QuickBooks email',
              'Your accountant sees every invoice in real time',
              'Payment confirmation advances the deal automatically',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="text-[11px] text-[var(--warm-400)] hover:text-red-500 transition-colors"
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect QuickBooks'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-[var(--warm-500)] leading-relaxed">
            Connect QuickBooks to automatically create and send invoices when customers agree to quotes. Your accountant sees everything in real time.
          </p>

          <div className="space-y-2 text-xs text-[var(--warm-600)]">
            {[
              'Invoices created automatically from agreed quotes',
              'Full line items and project details on every invoice',
              'Customer receives invoice via QuickBooks email',
              'Payment confirmation advances the deal stage automatically',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--warm-300)] flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <button
            onClick={connect}
            disabled={connecting || !status?.has_credentials}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2CA01C] text-white text-sm font-semibold hover:bg-[#248a17] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? <Loader2 size={14} className="animate-spin" /> : null}
            {connecting ? 'Connecting...' : 'Connect QuickBooks'}
          </button>

          {!status?.has_credentials && (
            <p className="text-[10px] text-[var(--warm-300)] text-center">
              Add credentials first — see the implementation guide for setup instructions.
            </p>
          )}
        </div>
      )}
    </div>
  )
}


