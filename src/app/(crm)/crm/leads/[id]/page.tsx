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
import StatusBadge from '@/components/crm/StatusBadge'
import ActivityTimeline from '@/components/crm/ActivityTimeline'
import PostCallCard from '@/components/crm/PostCallCard'
import { useAIScore, useAISuggestion, useAIActivitySummary } from '@/lib/crm/ai-hooks'
import ActivitySummary from '@/components/crm/ActivitySummary'
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
  Save,
  X,
  Zap,
  Activity,
  Target,
  Brain,
  Sparkles,
  AlertTriangle,
  Loader2,
  BellOff,
  Clock,
  Send,
  Inbox,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'
import { formatDistanceToNow, format, addDays, isFuture } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import SmartActions from '@/components/crm/SmartActions'
import SendConfirmation from '@/components/crm/SendConfirmation'
import { useAIPreferences } from '@/lib/crm/ai-preferences'
import type { MessageChannel } from '@/lib/crm/types'

type Tab = 'contact' | 'opportunities' | 'bookings' | 'messages' | 'invoices' | 'tasks' | 'activity'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('contact')
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
    { key: 'contact', label: 'Contact', icon: <User size={14} /> },
    { key: 'activity', label: 'Activity', icon: <Activity size={14} />, count: stageLog.length + messages.length },
    { key: 'opportunities', label: 'Opportunities', icon: <FileText size={14} />, count: leadOpportunities.length },
    { key: 'bookings', label: 'Bookings', icon: <Calendar size={14} />, count: bookings.length },
    { key: 'messages', label: 'Messages', icon: <MessageSquare size={14} />, count: messages.length },
    { key: 'invoices', label: 'Invoices', icon: <FileText size={14} />, count: invoices.length },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare size={14} />, count: tasks.length },
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-lg font-bold text-[var(--green-700)] shrink-0 avatar-hover">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-heading text-lg font-semibold text-[var(--warm-900)] truncate">{lead.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
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
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[var(--warm-600)] bg-[var(--warm-50)] hover:bg-[var(--warm-100)] rounded-xl transition-colors"
                  >
                    <Mail size={13} /> Email
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\s/g, '').replace(/^\+/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* AI Insights (left column) */}
            {(suggestLoading || aiSuggestion || aiScore) && (
              <div className="space-y-3">
                {/* AI Suggestion Banner */}
                {suggestLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--warm-100)] bg-[var(--warm-50)]">
                    <Loader2 size={14} className="animate-spin text-[var(--warm-400)]" />
                    <span className="text-xs text-[var(--warm-400)]">AI is analysing this lead...</span>
                  </div>
                ) : aiSuggestion ? (
                  <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                    aiSuggestion.urgency === 'high' ? 'text-red-700 bg-red-50 border-red-200' :
                    aiSuggestion.urgency === 'medium' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                    'text-[var(--green-700)] bg-[var(--green-50)] border-[var(--green-200)]'
                  }`}>
                    <Sparkles size={14} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{aiSuggestion.action}</p>
                      <p className="text-[11px] opacity-80 mt-0.5">{aiSuggestion.reason}</p>
                      {aiSuggestion.script_hint && (
                        <p className="text-[11px] opacity-70 mt-1 italic">&ldquo;{aiSuggestion.script_hint}&rdquo;</p>
                      )}
                      {aiSuggestion.risk && (
                        <p className="flex items-center gap-1 text-[10px] opacity-60 mt-1">
                          <AlertTriangle size={9} /> {aiSuggestion.risk}
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                      aiSuggestion.urgency === 'high' ? 'bg-red-100 text-red-700' :
                      aiSuggestion.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {aiSuggestion.urgency}
                    </span>
                  </div>
                ) : null}

                {/* AI Score Breakdown */}
                {aiScore && (
                  <div className="px-4 py-3 rounded-xl border border-[var(--warm-100)] bg-white card-hover-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={12} className="text-[var(--green-600)]" />
                      <span className="text-[11px] font-semibold text-[var(--warm-700)]">AI Score</span>
                      <span className="text-[10px] text-[var(--warm-400)] ml-auto">GPT</span>
                    </div>
                    <p className="text-xs text-[var(--warm-600)] mb-2">{aiScore.summary}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {aiScore.factors?.map((f) => (
                        <div key={f.label} className="bg-[var(--warm-50)] rounded-lg px-2.5 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--warm-500)]">{f.label}</span>
                            <span className="text-[10px] font-bold text-[var(--warm-700)]">{f.score}/{f.max}</span>
                          </div>
                          <div className="w-full h-1 bg-[var(--warm-100)] rounded-full mt-1">
                            <div
                              className="h-1 rounded-full bg-[var(--green-500)] transition-all"
                              style={{ width: `${(f.score / f.max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {aiScore.closing_tip && (
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-[var(--warm-50)]">
                        <Target size={10} className="text-[var(--green-600)] mt-0.5 shrink-0" />
                        <p className="text-[11px] text-[var(--warm-600)]">
                          <span className="font-semibold">Tip:</span> {aiScore.closing_tip}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Activity Summary — AI narrative of lead journey */}
            {suggestionsOn && (summaryLoading || activitySummary) && (
              <ActivitySummary summary={activitySummary} isLoading={summaryLoading} />
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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(lead)
  const updateLead = useUpdateLead()

  function handleSave() {
    updateLead.mutate(
      { id: lead.id, name: form.name, phone: form.phone, email: form.email, postcode: form.postcode, notes: form.notes },
      { onSuccess: () => setEditing(false) }
    )
  }

  const fields = [
    { label: 'Email', icon: <Mail size={14} />, key: 'email' as const, value: lead.email },
    { label: 'Phone', icon: <Phone size={14} />, key: 'phone' as const, value: lead.phone },
    { label: 'Postcode', icon: <MapPin size={14} />, key: 'postcode' as const, value: lead.postcode },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--warm-700)]">Contact Details</h3>
        {!editing ? (
          <button onClick={() => { setForm(lead); setEditing(true) }} className="flex items-center gap-1.5 text-xs text-[var(--warm-400)] hover:text-[var(--green-600)] transition-colors">
            <Edit3 size={12} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)]">
              <X size={12} /> Cancel
            </button>
            <button onClick={handleSave} disabled={updateLead.isPending} className="flex items-center gap-1 text-xs text-[var(--green-600)] hover:text-[var(--green-700)] font-medium">
              <Save size={12} /> Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs text-[var(--warm-400)] mb-1">Name</label>
          {editing ? (
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
          ) : (
            <p className="text-sm text-[var(--warm-800)]">{lead.name}</p>
          )}
        </div>

        {fields.map((f) => (
          <div key={f.key}>
            <label className="flex items-center gap-1.5 text-xs text-[var(--warm-400)] mb-1">
              {f.icon} {f.label}
            </label>
            {editing ? (
              <input value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
            ) : (
              <p className="text-sm text-[var(--warm-800)]">{f.value ?? '—'}</p>
            )}
          </div>
        ))}

        <div>
          <label className="block text-xs text-[var(--warm-400)] mb-1">Project Type</label>
          <p className="text-sm text-[var(--warm-800)]">{lead.project_type ?? '—'}</p>
        </div>

        <div>
          <label className="block text-xs text-[var(--warm-400)] mb-1">Budget Band</label>
          <p className="text-sm text-[var(--warm-800)]">{lead.budget_band ?? '—'}</p>
        </div>

        <div>
          <label className="block text-xs text-[var(--warm-400)] mb-1">Source</label>
          <p className="text-sm text-[var(--warm-800)]">{lead.source ?? '—'}</p>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6">
        <label className="block text-xs text-[var(--warm-400)] mb-1">Notes</label>
        {editing ? (
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-[var(--warm-800)] whitespace-pre-wrap">{lead.notes || '—'}</p>
        )}
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
