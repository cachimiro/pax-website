'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useLead,
  useUpdateLead,
  useBookingsByLead,
  useMessageLogs,
  useInvoicesByLead,
  useTasksByLead,
  useUpdateTask,
  useOpportunities,
  useStageLogByOpportunityIds,
  usePaymentsByLead,
  useSendMessage,
  useEmailMessagesByLead,
  useEmailEventsByLead,
  useSoftDeleteLead,
} from '@/lib/crm/hooks'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/crm/StatusBadge'
import ActivityTimeline from '@/components/crm/ActivityTimeline'
import PostCallCard from '@/components/crm/PostCallCard'
import { useAIScore, useAISuggestion, useAIActivitySummary } from '@/lib/crm/ai-hooks'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  FileText,
  CheckSquare,
  User,
  Edit3,
  X,
  Zap,
  Activity,
  Target,
  Brain,
  Loader2,
  BellOff,
  Clock,
  Send,
  Inbox,
  ChevronDown,
  ChevronUp,
  Trash2,
  Wrench,
} from 'lucide-react'
import { formatDistanceToNow, format, addDays, isFuture } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import SmartActions from '@/components/crm/SmartActions'
import SendConfirmation from '@/components/crm/SendConfirmation'
import { useAIPreferences } from '@/lib/crm/ai-preferences'
import type { MessageChannel } from '@/lib/crm/types'
import ProjectSummaryCard from '@/components/crm/ProjectSummaryCard'
import DiscoveryAnswersCard from '@/components/crm/DiscoveryAnswersCard'
import AIInsightsPanel from '@/components/crm/AIInsightsPanel'
import { parseLeadNotes } from '@/lib/crm/utils'
import { useMeet1Notes } from '@/lib/crm/hooks'

type Tab = 'contact' | 'opportunities' | 'bookings' | 'messages' | 'invoices' | 'tasks' | 'activity' | 'fitting'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('activity')
  const [tabUnderline, setTabUnderline] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [composeState, setComposeState] = useState<{ open: boolean; channel: MessageChannel; body: string; subject?: string; intent?: string } | null>(null)

  useEffect(() => {
    const el = tabRefs.current[activeTab]
    if (el) {
      setTabUnderline({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeTab])

  const { data: lead, isLoading } = useLead(id)
  const { data: opportunities = [] } = useOpportunities()
  const { data: bookings = [] } = useBookingsByLead(id)
  const { data: messages = [] } = useMessageLogs(id)
  const { data: invoices = [] } = useInvoicesByLead(id)
  const { data: tasks = [] } = useTasksByLead(id)
  const { data: emailMessages = [] } = useEmailMessagesByLead(id)

  const leadOpportunities = opportunities.filter((o) => o.lead_id === id)
  const opportunityIds = leadOpportunities.map((o) => o.id)
  const invoiceIds = invoices.map((inv) => inv.id)

  const { data: stageLog = [] } = useStageLogByOpportunityIds(opportunityIds)
  const { data: payments = [] } = usePaymentsByLead(invoiceIds)
  const sendMessage = useSendMessage()
  const softDeleteLead = useSoftDeleteLead()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const updateLead = useUpdateLead()

  const { suggestionsOn } = useAIPreferences()

  // GPT-powered AI scoring & suggestions (skip if AI disabled)
  const primaryOpp = leadOpportunities[0] ?? null
  const { data: meet1Notes, isLoading: meet1Loading } = useMeet1Notes(primaryOpp?.id ?? null)
  const parsedNotes = parseLeadNotes(lead?.notes)
  const { data: aiScore, isLoading: scoreLoading } = useAIScore(
    suggestionsOn ? lead : undefined,
    suggestionsOn ? primaryOpp : null
  )
  const { data: aiSuggestion, isLoading: suggestLoading } = useAISuggestion(
    suggestionsOn ? lead : undefined,
    suggestionsOn ? primaryOpp : null,
    tasks, bookings, messages
  )
  const { data: activitySummary, isLoading: summaryLoading } = useAIActivitySummary(
    suggestionsOn ? lead : undefined,
    stageLog, messages, tasks, bookings, suggestionsOn
  )

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'activity', label: 'Activity', icon: <Activity size={14} />, count: stageLog.length + messages.length },
    { key: 'contact', label: 'Contact', icon: <User size={14} /> },
    { key: 'opportunities', label: 'Opportunities', icon: <FileText size={14} />, count: leadOpportunities.length },
    { key: 'bookings', label: 'Bookings', icon: <Calendar size={14} />, count: bookings.length },
    { key: 'messages', label: 'Messages', icon: <MessageSquare size={14} />, count: messages.length },
    { key: 'invoices', label: 'Invoices', icon: <FileText size={14} />, count: invoices.length },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare size={14} />, count: tasks.length },
    { key: 'fitting', label: 'Fitting', icon: <Wrench size={14} /> },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[var(--warm-100)] rounded animate-pulse" />
        <div className="h-64 bg-[var(--warm-50)] rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--warm-500)]">Lead not found</p>
        <button onClick={() => router.push('/crm/leads')} className="mt-2 text-sm text-[var(--green-600)] hover:underline">
          Back to leads
        </button>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    contacted: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    lost: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  }

  return (
    <div>
      {/* Back + Delete */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push('/crm/leads')}
          className="flex items-center gap-1.5 text-sm text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors"
        >
          <ArrowLeft size={14} /> Back to leads
        </button>
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600">Move to trash?</span>
            <button onClick={() => { softDeleteLead.mutate(id); router.push('/crm/leads') }} className="text-xs font-medium text-red-600 hover:text-red-700">Yes</button>
            <button onClick={() => setConfirmingDelete(false)} className="text-xs text-[var(--warm-400)]">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1.5 text-xs text-[var(--warm-400)] hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Left column — sticky contact card + AI */}
        <div className="lg:w-[320px] lg:shrink-0">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Contact card */}
            <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 card-hover-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-2xl font-bold text-[var(--green-700)] shrink-0 font-heading avatar-hover">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-heading text-xl font-semibold text-[var(--warm-900)] truncate">{lead.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusColors[lead.status]}`}>
                      {lead.status}
                    </span>
                    {scoreLoading ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--warm-400)]">
                        <Loader2 size={9} className="animate-spin" /> Scoring
                      </span>
                    ) : aiScore ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        aiScore.tier === 'hot' ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200' :
                        aiScore.tier === 'warm' ? 'text-amber-700 bg-amber-50 ring-1 ring-amber-200' :
                        'text-[var(--warm-500)] bg-[var(--warm-50)] ring-1 ring-[var(--warm-200)]'
                      }`}>
                        <Brain size={9} />
                        {aiScore.score}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Contact details */}
              <div className="space-y-2.5 text-xs">
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-[var(--warm-600)] hover:text-[var(--green-700)] transition-colors">
                    <Mail size={13} className="text-[var(--warm-300)] shrink-0" /> <span className="truncate">{lead.email}</span>
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-[var(--warm-600)] hover:text-[var(--green-700)] transition-colors">
                    <Phone size={13} className="text-[var(--warm-300)] shrink-0" /> {lead.phone}
                  </a>
                )}
                {lead.postcode && (
                  <span className="flex items-center gap-2 text-[var(--warm-500)]">
                    <MapPin size={13} className="text-[var(--warm-300)] shrink-0" /> {lead.postcode}
                  </span>
                )}
                <span className="flex items-center gap-2 text-[var(--warm-400)]">
                  <Calendar size={13} className="text-[var(--warm-300)] shrink-0" />
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--warm-50)]">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[var(--green-700)] bg-[var(--green-50)] hover:bg-[var(--green-100)] rounded-xl transition-colors"
                  >
                    <Phone size={13} /> Call
                  </a>
                )}
                {lead.email && (
                  <button
                    onClick={() => setComposeState({ open: true, channel: 'email', body: '', intent: 'follow_up' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[var(--warm-600)] bg-[var(--warm-50)] hover:bg-[var(--warm-100)] rounded-xl transition-colors"
                  >
                    <Mail size={13} /> Email
                  </button>
                )}
                {lead.phone && (
                  <button
                    onClick={() => setComposeState({ open: true, channel: 'whatsapp', body: '', intent: 'follow_up' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>
                )}
              </div>
            </div>

            {/* Project summary */}
            <ProjectSummaryCard
              lead={lead}
              parsedNotes={parsedNotes}
              opportunity={primaryOpp}
            />

            {/* Discovery answers (Meet 1 + booking form) */}
            <DiscoveryAnswersCard
              meet1Notes={meet1Notes}
              isLoading={meet1Loading}
            />

            {/* AI Insights — collapsible panel */}
            {suggestionsOn && (
              <AIInsightsPanel
                aiSuggestion={aiSuggestion}
                suggestLoading={suggestLoading}
                aiScore={aiScore}
                scoreLoading={scoreLoading}
                activitySummary={activitySummary}
                summaryLoading={summaryLoading}
              />
            )}

            {/* Smart Actions + Snooze — only when AI suggestions enabled */}
            {suggestionsOn && (
              <>
                <SmartActions
                  lead={lead}
                  opportunities={leadOpportunities}
                  bookings={bookings}
                  tasks={tasks}
                  messages={messages}
                  onCompose={(channel, templateHint) => {
                    const firstName = lead.name?.split(' ')[0] ?? ''
                    const bodyMap: Record<string, string> = {
                      'follow-up': `Hi ${firstName},\n\nJust following up on our recent conversation. I wanted to check in and see if you had any questions.\n\nBest regards`,
                      'send-quote': `Hi ${firstName},\n\nPlease find attached the quote we discussed. Let me know if you have any questions or would like to proceed.\n\nBest regards`,
                      'payment-reminder': `Hi ${firstName},\n\nThis is a friendly reminder regarding the outstanding invoice. Please let us know if you need any assistance.\n\nBest regards`,
                      'booking-confirm': `Hi ${firstName},\n\nJust confirming your upcoming appointment. Please let us know if you need to reschedule.\n\nBest regards`,
                    }
                    setComposeState({
                      open: true,
                      channel: channel as MessageChannel,
                      body: bodyMap[templateHint] || `Hi ${firstName},\n\n\n\nBest regards`,
                      subject: channel === 'email' ? `Re: ${templateHint.replace(/-/g, ' ')}` : undefined,
                      intent: templateHint,
                    })
                  }}
                  onScheduleCall={() => {
                    router.push('/crm/calendar')
                  }}
                />

                {/* Snooze control */}
            <div className="px-4 py-3 rounded-xl border border-[var(--warm-100)] bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellOff size={12} className="text-[var(--warm-400)]" />
                  <span className="text-[11px] font-semibold text-[var(--warm-600)]">Snooze Nudges</span>
                </div>
                {lead.snoozed_until && isFuture(new Date(lead.snoozed_until)) ? (
                  <button
                    onClick={() => updateLead.mutate({ id: lead.id, snoozed_until: null } as any)}
                    className="text-[10px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    Snoozed until {format(new Date(lead.snoozed_until), 'dd MMM')} — Unsnooze
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    {[
                      { label: '1d', days: 1 },
                      { label: '3d', days: 3 },
                      { label: '7d', days: 7 },
                      { label: '14d', days: 14 },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        onClick={() =>
                          updateLead.mutate({
                            id: lead.id,
                            snoozed_until: addDays(new Date(), opt.days).toISOString(),
                          } as any)
                        }
                        className="px-2 py-0.5 text-[10px] font-medium text-[var(--warm-500)] hover:text-[var(--green-700)] hover:bg-[var(--green-50)] rounded-md transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </div>
        </div>

        {/* Right column — tabbed content */}
        <div className="flex-1 min-w-0">
          {/* Tabs with sliding underline */}
          <div className="relative flex items-center gap-1 mb-5 overflow-x-auto pb-px -mx-1 px-1 border-b border-[var(--warm-100)]">
            {tabs.map((t) => (
              <button
                key={t.key}
                ref={(el) => { tabRefs.current[t.key] = el }}
                onClick={() => setActiveTab(t.key)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
                  ${activeTab === t.key
                    ? 'text-[var(--green-700)]'
                    : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
                  }
                `}
              >
                {t.icon}
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className={`ml-0.5 text-[10px] rounded-full px-1.5 py-0.5 ${
                    activeTab === t.key ? 'bg-[var(--green-100)] text-[var(--green-700)]' : 'bg-[var(--warm-100)] text-[var(--warm-500)]'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
            <motion.div
              className="absolute bottom-0 h-[2px] bg-[var(--green-600)] rounded-full"
              animate={{ left: tabUnderline.left, width: tabUnderline.width }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          </div>

          {/* Tab content */}
          <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] card-hover-border">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'contact' && <ContactTab lead={lead} />}
                {activeTab === 'activity' && (
                  <div className="p-6">
                    <ActivityTimeline
                      stageLog={stageLog}
                      messages={messages}
                      tasks={tasks}
                      bookings={bookings}
                      payments={payments}
                      leadCreatedAt={lead.created_at}
                      emailMessages={emailMessages}
                    />
                  </div>
                )}
                {activeTab === 'opportunities' && <OpportunitiesTab opportunities={leadOpportunities} />}
                {activeTab === 'bookings' && <BookingsTab bookings={bookings} leadName={lead?.name ?? ''} />}
                {activeTab === 'messages' && <MessagesTab messages={messages} leadId={id} />}
                {activeTab === 'invoices' && <InvoicesTab invoices={invoices} />}
                {activeTab === 'tasks' && <TasksTab tasks={tasks} />}
                {activeTab === 'fitting' && <FittingTab opportunityIds={leadOpportunities.map(o => o.id)} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Send Confirmation Modal */}
      {composeState && (
        <SendConfirmation
          open={composeState.open}
          onClose={() => setComposeState(null)}
          lead={lead}
          channel={composeState.channel}
          subject={composeState.subject}
          body={composeState.body}
          senderName="PaxBespoke"
          recentMessages={messages.slice(0, 5).map((m) => ({ body: m.template ?? '', created_at: m.sent_at }))}
          opportunity={primaryOpp}
          intent={composeState.intent}
          messages={messages}
          onSend={async (data) => {
            await sendMessage.mutateAsync({
              lead_id: id,
              channel: data.channel,
              subject: data.subject,
              body: data.body,
            })
            setComposeState(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Contact Tab ─────────────────────────────────────────────────────────────

function ContactTab({ lead }: { lead: NonNullable<ReturnType<typeof useLead>['data']> }) {
  const updateLead = useUpdateLead()
  const { fields: noteChips, remainder: noteRemainder } = parseLeadNotes(lead.notes)

  // Per-field inline edit state
  type EditableField = 'name' | 'email' | 'phone' | 'postcode' | 'notes_remainder'
  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [fieldValue, setFieldValue] = useState('')

  function startEdit(field: EditableField, current: string | null) {
    setEditingField(field)
    setFieldValue(current ?? '')
  }

  function commitEdit(field: EditableField) {
    if (editingField !== field) return
    // Rebuild notes: replace remainder portion, keep parsed lines intact
    let patch: Record<string, string | null> = {}
    if (field === 'notes_remainder') {
      // Reconstruct notes: parsed lines + new remainder
      const parsedLines = noteChips.map(c => `${c.label}: ${c.value}`).join('\n')
      patch.notes = fieldValue.trim()
        ? `${parsedLines}\n${fieldValue.trim()}`
        : parsedLines || null
    } else {
      patch[field] = fieldValue.trim() || null
      if (field === 'name') patch[field] = fieldValue.trim() || lead.name
    }
    updateLead.mutate({ id: lead.id, ...patch })
    setEditingField(null)
  }

  function cancelEdit() {
    setEditingField(null)
  }

  const INPUT_CLS = 'w-full px-2.5 py-1.5 text-sm border border-[var(--green-300)] rounded-lg focus:border-[var(--green-500)] focus:outline-none bg-white shadow-sm'

  function InlineField({
    field, label, icon, value, multiline,
  }: {
    field: EditableField
    label: string
    icon: React.ReactNode
    value: string | null
    multiline?: boolean
  }) {
    const isEditing = editingField === field
    return (
      <div className="group">
        <label className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider mb-1">
          {icon} {label}
        </label>
        {isEditing ? (
          <div className="flex items-start gap-1.5">
            {multiline ? (
              <textarea
                autoFocus
                value={fieldValue}
                onChange={e => setFieldValue(e.target.value)}
                onBlur={() => commitEdit(field)}
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                rows={3}
                className={`${INPUT_CLS} resize-none flex-1`}
              />
            ) : (
              <input
                autoFocus
                value={fieldValue}
                onChange={e => setFieldValue(e.target.value)}
                onBlur={() => commitEdit(field)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit(field)
                  if (e.key === 'Escape') cancelEdit()
                }}
                className={`${INPUT_CLS} flex-1`}
              />
            )}
          </div>
        ) : (
          <button
            onClick={() => startEdit(field, value)}
            className="w-full text-left flex items-center gap-2 group/val"
          >
            <span className={`text-sm flex-1 ${value ? 'text-[var(--warm-800)]' : 'text-[var(--warm-300)] italic'}`}>
              {value || 'Click to add'}
            </span>
            <Edit3 size={11} className="text-[var(--warm-300)] opacity-0 group-hover/val:opacity-100 transition-opacity shrink-0" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <h3 className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider">Contact Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InlineField field="name"     label="Name"     icon={<User size={11} />}    value={lead.name} />
        <InlineField field="email"    label="Email"    icon={<Mail size={11} />}    value={lead.email} />
        <InlineField field="phone"    label="Phone"    icon={<Phone size={11} />}   value={lead.phone} />
        <InlineField field="postcode" label="Postcode" icon={<MapPin size={11} />}  value={lead.postcode} />
      </div>

      {/* Read-only fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--warm-50)]">
        {[
          { label: 'Project type', value: lead.project_type },
          { label: 'Budget',       value: lead.budget_band },
          { label: 'Source',       value: lead.source },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm text-[var(--warm-700)] capitalize">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Notes — chips + editable remainder */}
      <div className="pt-2 border-t border-[var(--warm-50)]">
        <p className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider mb-2">Notes</p>

        {noteChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {noteChips.map(({ label, value }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 bg-[var(--warm-50)] border border-[var(--warm-100)] rounded-lg px-2 py-1 text-[11px] text-[var(--warm-700)]"
              >
                <span className="text-[var(--warm-400)] font-medium">{label}:</span>
                <span>{value}</span>
              </span>
            ))}
          </div>
        )}

        <InlineField
          field="notes_remainder"
          label="Additional notes"
          icon={<FileText size={11} />}
          value={noteRemainder || null}
          multiline
        />
      </div>
    </div>
  )
}

// ─── Opportunities Tab ───────────────────────────────────────────────────────

import type { OpportunityWithLead } from '@/lib/crm/types'

function OpportunitiesTab({ opportunities }: { opportunities: OpportunityWithLead[] }) {
  if (opportunities.length === 0) {
    return <EmptyTab message="No opportunities linked to this lead" />
  }

  return (
    <div className="divide-y divide-[var(--warm-50)]">
      {opportunities.map((opp) => (
        <div key={opp.id} className="p-4 flex items-center justify-between">
          <div>
            <StatusBadge stage={opp.stage} />
            {opp.value_estimate != null && (
              <span className="ml-3 text-sm font-medium text-[var(--warm-700)]">
                £{opp.value_estimate.toLocaleString('en-GB')}
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--warm-400)]">
            Updated {formatDistanceToNow(new Date(opp.updated_at), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Bookings Tab ────────────────────────────────────────────────────────────

import type { Booking } from '@/lib/crm/types'

function BookingsTab({ bookings, leadName }: { bookings: Booking[]; leadName: string }) {
  if (bookings.length === 0) {
    return <EmptyTab message="No bookings yet" />
  }

  const typeColors: Record<string, string> = {
    call1: 'bg-blue-50 text-blue-700',
    call2: 'bg-emerald-50 text-emerald-700',
    onboarding: 'bg-purple-50 text-purple-700',
  }

  const outcomeColors: Record<string, string> = {
    pending: 'text-amber-600',
    completed: 'text-emerald-600',
    no_show: 'text-red-500',
    rescheduled: 'text-blue-500',
    owner_no_show: 'text-red-600',
    technical_issue: 'text-orange-500',
    partial: 'text-blue-500',
    cancelled: 'text-[var(--warm-400)]',
  }

  // Find bookings that need post-call attention
  const needsAttention = bookings.filter(
    (b) => (b.outcome === 'completed' && (!b.post_call_notes || b.ai_suggestion)) ||
           (b.ai_suggestion)
  )

  return (
    <div className="space-y-3">
      {/* Post-call cards (needs attention) */}
      {needsAttention.map((b) => (
        <div key={`pcc-${b.id}`} className="px-4 pt-3">
          <PostCallCard booking={b} leadName={leadName} />
        </div>
      ))}

      {/* Booking list */}
      <div className="divide-y divide-[var(--warm-50)]">
        {bookings.map((b) => (
          <div key={b.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[b.type] ?? ''}`}>
                  {b.type}
                </span>
                <span className="text-sm text-[var(--warm-700)]">
                  {format(new Date(b.scheduled_at), 'dd MMM yyyy, HH:mm')}
                </span>
                <span className="text-xs text-[var(--warm-400)]">{b.duration_min}min</span>
                {b.meet_link && (
                  <a
                    href={b.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Meet link
                  </a>
                )}
              </div>
              <span className={`text-xs font-medium capitalize ${outcomeColors[b.outcome] ?? ''}`}>
                {b.outcome === 'owner_no_show' ? 'Owner no-show' : b.outcome.replace('_', ' ')}
              </span>
            </div>
            {b.post_call_notes && (
              <p className="mt-2 text-xs text-[var(--warm-500)] line-clamp-2">{b.post_call_notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Messages Tab ────────────────────────────────────────────────────────────

import type { MessageLog } from '@/lib/crm/types'

function MessagesTab({ messages, leadId }: { messages: MessageLog[]; leadId: string }) {
  const { data: emailMessages = [] } = useEmailMessagesByLead(leadId)
  const { data: emailEvents = [] } = useEmailEventsByLead(leadId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const opens = emailEvents.filter((e) => e.event_type === 'open').length
  const clicks = emailEvents.filter((e) => e.event_type === 'click').length

  // Merge outbound message_logs and email_messages into a unified timeline
  type UnifiedMessage = {
    id: string
    direction: 'outbound' | 'inbound'
    channel: string
    subject: string | null
    preview: string
    body: string | null
    bodyHtml: string | null
    from: string | null
    timestamp: string
    status: string | null
    template: string | null
  }

  const unified: UnifiedMessage[] = [
    ...messages.map((m): UnifiedMessage => ({
      id: `log-${m.id}`,
      direction: 'outbound',
      channel: m.channel,
      subject: (m.metadata as Record<string, unknown>)?.subject as string | null ?? null,
      preview: (m.metadata as Record<string, unknown>)?.body as string | null ?? m.template ?? 'Message sent',
      body: (m.metadata as Record<string, unknown>)?.body as string | null ?? null,
      bodyHtml: null,
      from: null,
      timestamp: m.sent_at,
      status: m.status,
      template: m.template,
    })),
    ...emailMessages.map((em): UnifiedMessage => ({
      id: `email-${em.id}`,
      direction: em.direction,
      channel: 'email',
      subject: em.subject,
      preview: em.snippet ?? em.body_text?.slice(0, 120) ?? 'No content',
      body: em.body_text,
      bodyHtml: em.body_html,
      from: em.from_address,
      timestamp: em.received_at,
      status: null,
      template: null,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (unified.length === 0) {
    return <EmptyTab message="No messages yet" />
  }

  const channelColors: Record<string, string> = {
    email: 'bg-blue-50 text-blue-700',
    sms: 'bg-amber-50 text-amber-700',
    whatsapp: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <div className="space-y-2 p-4">
      {/* Engagement stats */}
      {(opens > 0 || clicks > 0) && (
        <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-[var(--warm-25)] border border-[var(--warm-100)] mb-1">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-medium text-[var(--warm-700)]">{opens}</span>
            <span className="text-[10px] text-[var(--warm-400)]">{opens === 1 ? 'open' : 'opens'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-medium text-[var(--warm-700)]">{clicks}</span>
            <span className="text-[10px] text-[var(--warm-400)]">{clicks === 1 ? 'click' : 'clicks'}</span>
          </div>
        </div>
      )}

      {unified.map((m) => {
        const isExpanded = expandedId === m.id
        const isInbound = m.direction === 'inbound'

        return (
          <div
            key={m.id}
            className={`rounded-lg border transition-colors cursor-pointer ${
              isInbound
                ? 'border-[var(--warm-100)] bg-[var(--warm-25)] mr-12'
                : 'border-blue-100 bg-blue-50/40 ml-12'
            }`}
            onClick={() => setExpandedId(isExpanded ? null : m.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2 min-w-0">
                {isInbound ? (
                  <Inbox className="w-3.5 h-3.5 text-[var(--warm-400)] shrink-0" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${channelColors[m.channel] ?? ''}`}>
                  {m.channel}
                </span>
                {m.subject && (
                  <span className="text-sm font-medium text-[var(--warm-700)] truncate">
                    {m.subject}
                  </span>
                )}
                {!m.subject && m.template && (
                  <span className="text-sm text-[var(--warm-500)] truncate">{m.template}</span>
                )}
                {isInbound && m.from && (
                  <span className="text-xs text-[var(--warm-400)] truncate">from {m.from}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {m.status && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    m.status === 'sent' || m.status === 'delivered'
                      ? 'bg-emerald-50 text-emerald-600'
                      : m.status === 'failed'
                      ? 'bg-red-50 text-red-600'
                      : m.status === 'queued'
                      ? 'bg-blue-50 text-blue-600'
                      : m.status === 'sending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-[var(--warm-50)] text-[var(--warm-400)]'
                  }`} title={
                    m.status === 'queued' ? 'Waiting in queue — will be sent within 2 minutes' :
                    m.status === 'sending' ? 'Currently being sent' :
                    m.status === 'sent' ? 'Successfully delivered' :
                    m.status === 'failed' ? 'Delivery failed — check channel configuration' :
                    m.status
                  }>
                    {m.status === 'queued' ? '⏳ queued' : m.status === 'sending' ? '⏳ sending' : m.status === 'sent' ? '✓ sent' : m.status === 'failed' ? '✗ failed' : m.status}
                  </span>
                )}
                <span className="text-xs text-[var(--warm-300)] whitespace-nowrap">
                  {format(new Date(m.timestamp), 'dd MMM, HH:mm')}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[var(--warm-300)]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--warm-300)]" />
                )}
              </div>
            </div>

            {/* Preview (collapsed) */}
            {!isExpanded && (
              <div className="px-3 pb-3 -mt-1">
                <p className="text-xs text-[var(--warm-400)] line-clamp-1">{m.preview}</p>
              </div>
            )}

            {/* Expanded body */}
            {isExpanded && (
              <div className="px-3 pb-3 border-t border-[var(--warm-50)]">
                {m.bodyHtml ? (
                  <div
                    className="text-sm text-[var(--warm-600)] mt-2 prose prose-sm max-w-none [&_a]:text-blue-600 [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
                  />
                ) : m.body ? (
                  <p className="text-sm text-[var(--warm-600)] mt-2 whitespace-pre-wrap">{m.body}</p>
                ) : (
                  <p className="text-sm text-[var(--warm-300)] mt-2 italic">No message body available</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Invoices Tab ────────────────────────────────────────────────────────────

import type { Invoice } from '@/lib/crm/types'

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return <EmptyTab message="No invoices" />
  }

  const statusColors: Record<string, string> = {
    sent: 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
    overdue: 'bg-red-50 text-red-600',
  }

  return (
    <div className="divide-y divide-[var(--warm-50)]">
      {invoices.map((inv) => (
        <div key={inv.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--warm-800)]">
              £{inv.amount.toLocaleString('en-GB')}
            </span>
            {inv.deposit_amount && (
              <span className="text-xs text-[var(--warm-400)]">
                (Deposit: £{inv.deposit_amount.toLocaleString('en-GB')})
              </span>
            )}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[inv.status] ?? ''}`}>
            {inv.status}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Tasks Tab ───────────────────────────────────────────────────────────────

import type { Task } from '@/lib/crm/types'

function TasksTab({ tasks }: { tasks: Task[] }) {
  const updateTask = useUpdateTask()

  if (tasks.length === 0) {
    return <EmptyTab message="No tasks" />
  }

  return (
    <div className="divide-y divide-[var(--warm-50)]">
      {tasks.map((t) => (
        <div key={t.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateTask.mutate({ id: t.id, status: t.status === 'open' ? 'done' : 'open' })}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                t.status === 'done'
                  ? 'bg-[var(--green-600)] border-[var(--green-600)] text-white'
                  : 'border-[var(--warm-300)] hover:border-[var(--green-500)]'
              }`}
            >
              {t.status === 'done' && <CheckSquare size={12} />}
            </button>
            <div>
              <span className={`text-sm ${t.status === 'done' ? 'text-[var(--warm-400)] line-through' : 'text-[var(--warm-800)]'}`}>
                {t.type}
              </span>
              {t.description && (
                <p className="text-xs text-[var(--warm-400)] mt-0.5">{t.description}</p>
              )}
            </div>
          </div>
          {t.due_at && (
            <span className="text-xs text-[var(--warm-400)]">
              {format(new Date(t.due_at), 'dd MMM')}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-sm text-[var(--warm-400)]">
      {message}
    </div>
  )
}

function FittingTab({ opportunityIds }: { opportunityIds: string[] }) {
  const [jobs, setJobs] = useState<Array<{
    id: string; job_code: string; status: string; scheduled_date: string | null;
    customer_name: string | null; fitting_fee: number | null;
    fitter_name: string | null; scope_of_work: string | null;
    completed_at: string | null; signed_off_at: string | null;
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (opportunityIds.length === 0) { setLoading(false); return }
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('fitting_jobs')
        .select('id, job_code, status, scheduled_date, customer_name, fitting_fee, scope_of_work, completed_at, signed_off_at, subcontractors(name)')
        .in('opportunity_id', opportunityIds)
        .order('created_at', { ascending: false })
      setJobs((data || []).map((j: Record<string, unknown>) => {
        const subRaw = j.subcontractors as unknown
        const sub = Array.isArray(subRaw) ? subRaw[0] as { name: string } | undefined : subRaw as { name: string } | null
        return { ...j, fitter_name: sub?.name || null } as (typeof jobs)[0]
      }))
      setLoading(false)
    }
    load()
  }, [opportunityIds])

  if (loading) return <div className="p-4 text-center"><Loader2 size={16} className="animate-spin mx-auto text-[var(--warm-400)]" /></div>
  if (jobs.length === 0) return <EmptyTab message="No fitting jobs for this lead" />

  const STATUS_COLORS: Record<string, string> = {
    offered: 'bg-purple-100 text-purple-700',
    assigned: 'bg-blue-100 text-blue-700',
    claimed: 'bg-cyan-100 text-cyan-700',
    accepted: 'bg-indigo-100 text-indigo-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    signed_off: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-teal-100 text-teal-700',
    open_board: 'bg-yellow-100 text-yellow-700',
    declined: 'bg-orange-100 text-orange-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <Link key={job.id} href="/crm/fittings" className="block bg-white rounded-xl border border-[var(--warm-100)] p-4 hover:border-[var(--warm-200)] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-[var(--warm-400)]" />
              <span className="text-xs font-mono text-[var(--warm-500)]">{job.job_code}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-500'}`}>
                {job.status.replace(/_/g, ' ')}
              </span>
            </div>
            {job.fitting_fee && <span className="text-xs font-medium text-green-700">£{job.fitting_fee}</span>}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--warm-500)]">
            {job.fitter_name && <span className="flex items-center gap-1"><User size={11} />{job.fitter_name}</span>}
            {job.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {new Date(job.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
            {job.scope_of_work && <span className="truncate max-w-[200px]">{job.scope_of_work}</span>}
          </div>
          {(job.completed_at || job.signed_off_at) && (
            <div className="flex gap-3 mt-2 text-[10px] text-[var(--warm-400)]">
              {job.completed_at && <span>Completed: {format(new Date(job.completed_at), 'dd MMM HH:mm')}</span>}
              {job.signed_off_at && <span>Signed off: {format(new Date(job.signed_off_at), 'dd MMM HH:mm')}</span>}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}

