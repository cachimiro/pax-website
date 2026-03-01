'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfiles, useServiceRegions, useUpdateServiceRegion } from '@/lib/crm/hooks'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, Mail, MapPin, Edit3, Save, X, ChevronDown, ChevronUp, Copy, Check, Globe, Brain, Link2, AlertTriangle, Loader2, Plus, Trash2, Clock, Zap, PenTool } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_TEMPLATES } from '@/lib/crm/messaging/templates'
import { useMessageTemplates, useUpdateTemplate, useCreateTemplate, useDeleteTemplate, useSignature, useUpdateSignature, useChannelStatus } from '@/lib/crm/hooks'
import type { SignatureConfig } from '@/lib/crm/hooks'
import { useAIPreferences, AI_PREF_DEFAULTS } from '@/lib/crm/ai-preferences'
import { useGoogleStatus, useGoogleConnect, useGoogleDisconnect, useGoogleToggle } from '@/lib/crm/hooks'
import type { Profile, UserRole, RegionStatus, AIPreferences, MessageTemplate, DelayRule, MessageChannel } from '@/lib/crm/types'
import { formatDistanceToNow } from 'date-fns'

type SettingsTab = 'users' | 'templates' | 'coverage' | 'ai' | 'signature' | 'integrations'

const BASE_TABS = [
  { key: 'users' as const, label: 'Users', icon: <Users size={14} /> },
  { key: 'templates' as const, label: 'Templates', icon: <Mail size={14} /> },
  { key: 'coverage' as const, label: 'Coverage', icon: <Globe size={14} /> },
  { key: 'ai' as const, label: 'AI', icon: <Brain size={14} /> },
  { key: 'signature' as const, label: 'Signature', icon: <PenTool size={14} /> },
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
    <div className="space-y-4">
      <p className="text-xs text-[var(--warm-400)] leading-relaxed">
        Team members who can log in to the CRM. <strong>Admin</strong> = full access + settings. <strong>Sales</strong> = leads and pipeline up to deposit. <strong>Operations</strong> = onboarding, production, and installation.
      </p>
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
    </div>
  )
}

// ─── Templates ───────────────────────────────────────────────────────────────

const CHANNEL_OPTIONS: { value: MessageChannel; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'sms', label: 'SMS', icon: '💬' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
]

const DELAY_LABELS: Record<DelayRule, string> = {
  immediate: 'Send immediately',
  minutes_before_booking: 'Before booking',
  minutes_after_stage: 'After stage change',
  minutes_after_enquiry: 'After enquiry',
}

const DELAY_HELP: Record<DelayRule, string> = {
  immediate: 'Sends as soon as the stage changes (processed every 2 minutes by the queue).',
  minutes_before_booking: 'Sends X minutes before the scheduled call/visit. Only works when a booking exists for this stage.',
  minutes_after_stage: 'Waits X minutes after the stage changes, then sends. Use for follow-ups.',
  minutes_after_enquiry: 'Waits X minutes after the lead first enquired. Use for drip sequences.',
}

const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'First Name', desc: 'Lead\'s first name (e.g. "Sarah"). Always available.', example: 'Sarah' },
  { key: 'name', label: 'Full Name', desc: 'Lead\'s full name (e.g. "Sarah Mitchell"). Always available.', example: 'Sarah Mitchell' },
  { key: 'owner_name', label: 'Owner Name', desc: 'Name of the team member assigned to this lead.', example: 'John Smith' },
  { key: 'project_type', label: 'Project Type', desc: 'Type of wardrobe project (e.g. "walk-in wardrobe"). From the lead\'s enquiry.', example: 'walk-in wardrobe' },
  { key: 'date', label: 'Booking Date', desc: 'Date of the scheduled call/visit (e.g. "Mon 3 Mar"). Only available when a booking exists.', example: 'Mon 3 Mar' },
  { key: 'time', label: 'Booking Time', desc: 'Time of the scheduled call/visit (e.g. "10:00"). Only available when a booking exists.', example: '10:00' },
  { key: 'amount', label: 'Deposit Amount', desc: 'Deposit amount in GBP (30% of project value). Only available at "Awaiting Deposit" stage.', example: '1,500' },
  { key: 'booking_link', label: 'Booking Link', desc: 'Link to the public booking page where leads can schedule a call.', example: 'https://paxbespoke.uk/book' },
  { key: 'payment_link', label: 'Payment Link', desc: 'Stripe checkout link for deposit payment. Auto-generated at "Awaiting Deposit" stage.', example: 'https://checkout.stripe.com/...' },
  { key: 'meet_link', label: 'Google Meet Link', desc: 'Video call link auto-created when a call is booked. Only available for call1/call2 stages.', example: 'https://meet.google.com/abc-defg-hij' },
]

const STAGE_OPTIONS = [
  { value: '', label: 'Manual only (no trigger)' },
  { value: 'new_enquiry', label: 'New Enquiry' },
  { value: 'call1_scheduled', label: 'Call 1 Scheduled' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'call2_scheduled', label: 'Call 2 Scheduled' },
  { value: 'proposal_agreed', label: 'Proposal Agreed' },
  { value: 'awaiting_deposit', label: 'Awaiting Deposit' },
  { value: 'deposit_paid', label: 'Deposit Paid' },
  { value: 'onboarding_scheduled', label: 'Onboarding Scheduled' },
  { value: 'onboarding_complete', label: 'Onboarding Complete' },
  { value: 'production', label: 'Production' },
  { value: 'installation', label: 'Installation' },
  { value: 'complete', label: 'Complete' },
]

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

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

function TemplatesSection() {
  const { data: templates = [], isLoading } = useMessageTemplates()
  const updateTemplate = useUpdateTemplate()
  const createTemplate = useCreateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const { data: queue } = useQueueDepth()
  const qc = useQueryClient()
  const [processing, setProcessing] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<MessageTemplate>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [showVarRef, setShowVarRef] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', slug: '', subject: '', body: '', channels: ['email'] as MessageChannel[], trigger_stage: '', delay_rule: 'immediate' as DelayRule, delay_minutes: 0 })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [testChannel, setTestChannel] = useState<MessageChannel | null>(null)
  const [testTo, setTestTo] = useState('')
  const [testSending, setTestSending] = useState(false)

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
    } catch {
      toast.error('Failed to process queue')
    } finally {
      setProcessing(false)
    }
  }

  function startEdit(t: MessageTemplate) {
    setEditingId(t.id)
    setEditForm({ name: t.name, subject: t.subject, body: t.body, channels: [...t.channels], delay_rule: t.delay_rule, delay_minutes: t.delay_minutes, trigger_stage: t.trigger_stage, active: t.active })
  }

  async function saveEdit() {
    if (!editingId) return
    try {
      await updateTemplate.mutateAsync({ id: editingId, ...editForm })
      toast.success('Template saved')
      setEditingId(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleCreate() {
    if (!newForm.name || !newForm.slug) { toast.error('Name and slug required'); return }
    try {
      await createTemplate.mutateAsync({
        ...newForm,
        trigger_stage: newForm.trigger_stage || null,
      })
      toast.success('Template created')
      setShowCreate(false)
      setNewForm({ name: '', slug: '', subject: '', body: '', channels: ['email'], trigger_stage: '', delay_rule: 'immediate', delay_minutes: 0 })
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTemplate.mutateAsync(id)
      toast.success('Template deleted')
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function sendTest(template: MessageTemplate) {
    if (!testChannel || !testTo) { toast.error('Select channel and enter recipient'); return }
    setTestSending(true)
    try {
      const res = await fetch('/api/crm/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject,
          body: template.body,
          channel: testChannel,
          to: testTo,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.detail ?? `Test sent via ${data.sentVia ?? testChannel}`, { duration: 6000 })
        setTestChannel(null)
        setTestTo('')
      } else {
        toast.error(data.error ?? 'Send failed', { duration: 8000 })
      }
    } catch {
      toast.error('Send failed')
    } finally {
      setTestSending(false)
    }
  }

  function toggleChannel(channels: MessageChannel[], ch: MessageChannel): MessageChannel[] {
    return channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch]
  }

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
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 mb-3">
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
          <button
            onClick={processQueue}
            disabled={processing || queue.ready_to_send === 0}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            {processing ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
            Process Now
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <p className="text-xs text-[var(--warm-400)]">{templates.length} templates</p>
          <button
            onClick={() => setShowVarRef(!showVarRef)}
            className="text-[10px] font-medium text-[var(--green-600)] hover:text-[var(--green-700)] transition-colors flex items-center gap-1"
          >
            {showVarRef ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Variable Reference
          </button>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--green-600)] rounded-lg hover:bg-[var(--green-700)] transition-colors"
        >
          <Plus size={12} /> New Template
        </button>
      </div>

      {/* Variable Reference Panel */}
      <AnimatePresence>
        {showVarRef && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-[var(--green-50)] to-white rounded-2xl border border-[var(--green-100)] p-4 mb-3">
              <p className="text-[10px] font-semibold text-[var(--green-700)] uppercase tracking-wider mb-2.5">
                Template Variables — click to copy
              </p>
              <p className="text-[10px] text-[var(--warm-400)] mb-3">
                Use these in your template subject or body. They get replaced with real data when the message is sent.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => { navigator.clipboard.writeText(`{{${v.key}}}`); toast.success(`Copied {{${v.key}}}`) }}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/80 transition-colors text-left group"
                  >
                    <code className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[var(--green-100)] text-[var(--green-700)] shrink-0 group-hover:border-[var(--green-300)]">
                      {`{{${v.key}}}`}
                    </code>
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium text-[var(--warm-700)] block">{v.label}</span>
                      <span className="text-[9px] text-[var(--warm-400)] block leading-tight">{v.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-[var(--green-200)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Name</label>
                  <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="e.g. Follow-up Nudge" className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Slug (unique ID)</label>
                  <input value={newForm.slug} onChange={(e) => setNewForm({ ...newForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="e.g. followup_nudge" className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Subject</label>
                <input value={newForm.subject} onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} placeholder="Email subject line" className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Body</label>
                <textarea value={newForm.body} onChange={(e) => setNewForm({ ...newForm, body: e.target.value })} rows={5} placeholder="Message body with {{placeholders}}" className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Channels</label>
                  <div className="flex gap-2">
                    {CHANNEL_OPTIONS.map((ch) => (
                      <button
                        key={ch.value}
                        onClick={() => setNewForm({ ...newForm, channels: toggleChannel(newForm.channels, ch.value) })}
                        className={`px-2.5 py-1 text-[10px] rounded-lg font-medium transition-colors ${
                          newForm.channels.includes(ch.value)
                            ? 'bg-[var(--green-50)] text-[var(--green-700)] ring-1 ring-[var(--green-200)]'
                            : 'bg-[var(--warm-50)] text-[var(--warm-400)] ring-1 ring-[var(--warm-100)]'
                        }`}
                      >
                        {ch.icon} {ch.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Trigger Stage</label>
                  <select value={newForm.trigger_stage} onChange={(e) => setNewForm({ ...newForm, trigger_stage: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                    {STAGE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <p className="text-[9px] text-[var(--warm-400)] mt-1">When a lead moves to this pipeline stage, this template is automatically queued for sending.</p>
                </div>
              </div>
              {newForm.trigger_stage && (
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Timing</label>
                      <select value={newForm.delay_rule} onChange={(e) => setNewForm({ ...newForm, delay_rule: e.target.value as DelayRule })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                        {Object.entries(DELAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    {newForm.delay_rule !== 'immediate' && (
                      <div>
                        <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Delay (minutes)</label>
                        <input type="number" value={newForm.delay_minutes} onChange={(e) => setNewForm({ ...newForm, delay_minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-[var(--warm-400)] mt-1.5 leading-relaxed">{DELAY_HELP[newForm.delay_rule]}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)] transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={createTemplate.isPending} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[var(--green-600)] rounded-lg hover:bg-[var(--green-700)] transition-colors disabled:opacity-50">
                  {createTemplate.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template list */}
      {templates.map((t) => {
        const isEditing = editingId === t.id

        return (
          <div key={t.id} className={`bg-white rounded-2xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-colors ${t.active ? 'border-[var(--warm-100)]' : 'border-dashed border-[var(--warm-200)] opacity-60'}`}>
            {/* Header row */}
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => isEditing ? setEditingId(null) : startEdit(t)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--warm-800)]">{t.name}</span>
                  {!t.active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--warm-100)] text-[var(--warm-400)]">Inactive</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {t.channels.map((ch) => (
                    <span key={ch} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warm-50)] text-[var(--warm-500)] font-medium ring-1 ring-[var(--warm-100)]">
                      {CHANNEL_OPTIONS.find((c) => c.value === ch)?.icon ?? ''} {ch}
                    </span>
                  ))}
                  {t.trigger_stage && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium ring-1 ring-blue-100">
                      <Zap size={8} /> {STAGE_OPTIONS.find((s) => s.value === t.trigger_stage)?.label ?? t.trigger_stage}
                    </span>
                  )}
                  {t.delay_rule !== 'immediate' && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium ring-1 ring-amber-100">
                      <Clock size={8} /> {formatDelay(t.delay_minutes)} {t.delay_rule === 'minutes_before_booking' ? 'before' : 'after'}
                    </span>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {/* Active toggle */}
                <button
                  onClick={() => updateTemplate.mutate({ id: t.id, active: !t.active })}
                  className={`relative w-9 h-[20px] rounded-full transition-colors duration-200 ${t.active ? 'bg-[var(--green-600)]' : 'bg-[var(--warm-200)]'}`}
                  title={t.active ? 'Active' : 'Inactive'}
                >
                  <motion.div
                    className="absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm"
                    animate={{ left: t.active ? 18 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
                {isEditing ? (
                  <ChevronUp size={14} className="text-[var(--warm-400)]" />
                ) : (
                  <ChevronDown size={14} className="text-[var(--warm-400)]" />
                )}
              </div>
            </div>

            {/* Edit form */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-[var(--warm-50)] space-y-3 pt-3">
                    <div>
                      <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Name</label>
                      <input value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Subject</label>
                      <input value={editForm.subject ?? ''} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] text-[var(--warm-400)] uppercase tracking-wider">Body</label>
                        <div className="flex gap-1 flex-wrap">
                          {TEMPLATE_VARIABLES.slice(0, 5).map((v) => (
                            <button
                              key={v.key}
                              onClick={() => setEditForm({ ...editForm, body: (editForm.body ?? '') + `{{${v.key}}}` })}
                              className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[var(--green-50)] text-[var(--green-600)] hover:bg-[var(--green-100)] transition-colors"
                              title={v.desc}
                            >
                              {v.key}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea value={editForm.body ?? ''} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows={8} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none resize-y font-mono leading-relaxed" />
                      {/* Live preview */}
                      <div className="mt-2 p-3 rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)]">
                        <p className="text-[9px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-1.5">Preview (with test data)</p>
                        <p className="text-xs text-[var(--warm-700)] whitespace-pre-wrap leading-relaxed">
                          {(editForm.body ?? '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
                            const v = TEMPLATE_VARIABLES.find((tv) => tv.key === key)
                            return v?.example ?? `[${key}]`
                          })}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Channels</label>
                      <div className="flex gap-2">
                        {CHANNEL_OPTIONS.map((ch) => (
                          <button
                            key={ch.value}
                            onClick={() => setEditForm({ ...editForm, channels: toggleChannel(editForm.channels ?? [], ch.value) })}
                            className={`px-2.5 py-1 text-[10px] rounded-lg font-medium transition-colors ${
                              (editForm.channels ?? []).includes(ch.value)
                                ? 'bg-[var(--green-50)] text-[var(--green-700)] ring-1 ring-[var(--green-200)]'
                                : 'bg-[var(--warm-50)] text-[var(--warm-400)] ring-1 ring-[var(--warm-100)]'
                            }`}
                          >
                            {ch.icon} {ch.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Trigger Stage</label>
                        <select value={editForm.trigger_stage ?? ''} onChange={(e) => setEditForm({ ...editForm, trigger_stage: e.target.value || null })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                          {STAGE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Timing</label>
                        <select value={editForm.delay_rule ?? 'immediate'} onChange={(e) => setEditForm({ ...editForm, delay_rule: e.target.value as DelayRule })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none">
                          {Object.entries(DELAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      {editForm.delay_rule !== 'immediate' && (
                        <div>
                          <label className="block text-[10px] text-[var(--warm-400)] mb-1 uppercase tracking-wider">Delay (minutes)</label>
                          <input type="number" value={editForm.delay_minutes ?? 0} onChange={(e) => setEditForm({ ...editForm, delay_minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-xl focus:border-[var(--green-500)] focus:outline-none" />
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-[var(--warm-400)] leading-relaxed">{DELAY_HELP[editForm.delay_rule as DelayRule ?? 'immediate']}</p>
                    {/* Send Test */}
                    <div className="flex items-center gap-2 pt-2 pb-1 border-t border-dashed border-[var(--warm-100)]">
                      <span className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider shrink-0">Send Test</span>
                      <select
                        value={testChannel ?? ''}
                        onChange={(e) => setTestChannel((e.target.value || null) as MessageChannel | null)}
                        className="px-2 py-1 text-[10px] border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none"
                      >
                        <option value="">Channel...</option>
                        {t.channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                      </select>
                      <input
                        value={testTo}
                        onChange={(e) => setTestTo(e.target.value)}
                        placeholder={testChannel === 'email' ? 'email@example.com' : '+447...'}
                        className="flex-1 px-2 py-1 text-[10px] border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none"
                      />
                      <button
                        onClick={() => sendTest(t)}
                        disabled={testSending || !testChannel || !testTo}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {testSending ? <Loader2 size={10} className="animate-spin" /> : <Mail size={10} />} Send
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        {confirmDelete === t.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600">Delete this template?</span>
                            <button onClick={() => handleDelete(t.id)} className="text-xs text-red-600 font-medium hover:text-red-700">Yes, delete</button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs text-[var(--warm-400)]">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(t.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)] transition-colors">Cancel</button>
                        <button onClick={saveEdit} disabled={updateTemplate.isPending} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[var(--green-600)] rounded-lg hover:bg-[var(--green-700)] transition-colors disabled:opacity-50">
                          {updateTemplate.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {templates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-[var(--warm-300)]">No templates yet. Create one to get started.</p>
        </div>
      )}
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

// ─── AI Preferences ──────────────────────────────────────────────────────────

function AISection() {
  const { prefs, update, isUpdating } = useAIPreferences()

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
    </div>
  )
}
