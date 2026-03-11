'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useLead,
  useUpdateLead,
  useBookingsByLead,
  useMessageLogs,
  useMessageDrafts,
  useDismissDraft,
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
  useMessageTemplates,
} from '@/lib/crm/hooks'
import { createClient } from '@/lib/supabase/client'

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
  Plus,
} from 'lucide-react'
import { formatDistanceToNow, format, addDays, isFuture } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

import SmartActions from '@/components/crm/SmartActions'
import SendConfirmation from '@/components/crm/SendConfirmation'
import { useAIPreferences } from '@/lib/crm/ai-preferences'
import type { MessageChannel } from '@/lib/crm/types'

import DiscoveryAnswersCard from '@/components/crm/DiscoveryAnswersCard'

import { parseLeadNotes } from '@/lib/crm/utils'
import { useMeet1Notes, useCreateTask, useProfiles, useUpdateOpportunity, useCreateOpportunity, useMoveOpportunityStage } from '@/lib/crm/hooks'
import { useCurrentProfile } from '@/lib/crm/current-profile'
import { STAGES, STAGE_ORDER } from '@/lib/crm/stages'
import LeadNotesTab from '@/components/crm/LeadNotesTab'
import OverviewTab from '@/components/crm/OverviewTab'
import StageProgressBar from '@/components/crm/StageProgressBar'
import CallLogForm from '@/components/crm/CallLogForm'
import type { OpportunityWithLead, OpportunityStage, Booking, MessageLog, Invoice, Task, Payment } from '@/lib/crm/types'

type Tab = 'overview' | 'contact' | 'pipeline' | 'comms' | 'money' | 'tasks' | 'notes' | 'fitting'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showCallLog, setShowCallLog] = useState(false)

  const [moreTabOpen, setMoreTabOpen] = useState(false)
  const moreTabRef = useRef<HTMLDivElement>(null)

  // Close "More" dropdown on outside click
  useEffect(() => {
    if (!moreTabOpen) return
    function handleClick(e: MouseEvent) {
      if (moreTabRef.current && !moreTabRef.current.contains(e.target as Node)) {
        setMoreTabOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moreTabOpen])
  const [composeState, setComposeState] = useState<{ open: boolean; channel: MessageChannel; body: string; subject?: string; intent?: string } | null>(null)

  // Guard: if id is not a valid UUID, redirect rather than fire 400s against Supabase
  const isValidId = UUID_RE.test(id ?? '')
  useEffect(() => {
    if (!isValidId) router.replace('/crm/leads')
  }, [isValidId, router])

  const { data: lead, isLoading } = useLead(isValidId ? id : '')
  const { data: opportunities = [] } = useOpportunities()
  const { data: bookings = [] } = useBookingsByLead(isValidId ? id : '')
  const { data: messages = [] } = useMessageLogs(isValidId ? id : '')
  const { data: messageDrafts = [] } = useMessageDrafts(isValidId ? id : '')
  const { data: invoices = [] } = useInvoicesByLead(isValidId ? id : '')
  const { data: tasks = [] } = useTasksByLead(isValidId ? id : '')
  const { data: emailMessages = [] } = useEmailMessagesByLead(isValidId ? id : '')

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number; draftCount?: number }[] = [
    { key: 'overview',  label: 'Overview',  icon: <Activity size={14} />,      count: stageLog.length + messages.length },
    { key: 'contact',   label: 'Contact',   icon: <User size={14} /> },
    { key: 'pipeline',  label: 'Pipeline',  icon: <Target size={14} />,         count: leadOpportunities.length },
    { key: 'comms',     label: 'Comms',     icon: <MessageSquare size={14} />,  count: messages.length + bookings.length, draftCount: messageDrafts.length },
    { key: 'money',     label: 'Money',     icon: <FileText size={14} />,       count: invoices.length },
    { key: 'tasks',     label: 'Tasks',     icon: <CheckSquare size={14} />,    count: tasks.length },
    { key: 'notes',     label: 'Notes',     icon: <FileText size={14} /> },
    { key: 'fitting',   label: 'Fitting',   icon: <Wrench size={14} /> },
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
    new:            'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    contacted:      'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    qualified:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    proposal_sent:  'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    won:            'bg-green-50 text-green-700 ring-1 ring-green-200',
    lost:           'bg-red-50 text-red-600 ring-1 ring-red-200',
    on_hold:        'bg-[var(--warm-50)] text-[var(--warm-500)] ring-1 ring-[var(--warm-200)]',
  }

  const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'on_hold'] as const

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push('/crm/leads')}
          className="flex items-center gap-1.5 text-sm text-[var(--warm-400)] hover:text-[var(--warm-700)] transition-colors"
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
          <button onClick={() => setConfirmingDelete(true)} className="flex items-center gap-1.5 text-xs text-[var(--warm-400)] hover:text-red-500 transition-colors">
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      {/* ── Hero Header (full width) ─────────────────────────────────────── */}
      <div className="bg-white border border-[var(--warm-100)] rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-xl font-bold text-[var(--green-700)] shrink-0 font-heading">
            {lead.name.charAt(0).toUpperCase()}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">{lead.name}</h1>
              <select
                value={lead.status}
                onChange={e => updateLead.mutate({ id: lead.id, status: e.target.value as typeof lead.status })}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${statusColors[lead.status] ?? statusColors.new}`}
              >
                {LEAD_STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
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
                  <Brain size={9} /> {aiScore.score}
                </span>
              ) : null}
            </div>

            {/* Contact chips row */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--green-700)] transition-colors">
                  <Mail size={11} className="text-[var(--warm-300)] shrink-0" /> {lead.email}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--green-700)] transition-colors">
                  <Phone size={11} className="text-[var(--warm-300)] shrink-0" /> {lead.phone}
                </a>
              )}
              {lead.postcode && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--warm-400)]">
                  <MapPin size={11} className="text-[var(--warm-300)] shrink-0" /> {lead.postcode}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-[var(--warm-400)]">
                <Calendar size={11} className="text-[var(--warm-300)] shrink-0" />
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Action buttons — right-aligned */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--green-700)] bg-[var(--green-50)] hover:bg-[var(--green-100)] border border-[var(--green-200)] rounded-lg transition-colors">
                <Phone size={12} /> Call
              </a>
            )}
            {lead.email && (
              <button
                onClick={() => setComposeState({ open: true, channel: 'email', body: '', intent: 'follow_up' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--warm-600)] bg-white hover:bg-[var(--warm-50)] border border-[var(--warm-200)] rounded-lg transition-colors">
                <Mail size={12} /> Email
              </button>
            )}
            {lead.phone && (
              <button
                onClick={() => setComposeState({ open: true, channel: 'whatsapp', body: '', intent: 'follow_up' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
                <MessageSquare size={12} /> WhatsApp
              </button>
            )}
            {lead.phone && (
              <button
                onClick={() => setShowCallLog(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--warm-500)] hover:text-[var(--warm-700)] border border-dashed border-[var(--warm-200)] hover:border-[var(--warm-300)] rounded-lg transition-colors">
                <Phone size={12} /> Log call
              </button>
            )}
          </div>
        </div>

        {/* Call log form — expands below header */}
        {showCallLog && lead.phone && (
          <div className="mt-4 pt-4 border-t border-[var(--warm-100)]">
            <CallLogForm
              leadId={id}
              existingNotes={lead.notes}
              primaryOppId={primaryOpp?.id ?? null}
              onClose={() => setShowCallLog(false)}
            />
          </div>
        )}
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* Left column — unified side panel, sticky within the scrolling main */}
        <div className="w-full lg:w-[340px] lg:shrink-0">
          <div className="lg:sticky lg:top-0 space-y-0">

            {/* ── Unified Side Panel ─────────────────────────────────── */}
            <div className="bg-white border border-[var(--warm-100)] rounded-2xl overflow-hidden">

              {/* Section: Project */}
              <div className="p-4">
                <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-3">Project</p>

                {/* Stage badge + mini progress bar */}
                {primaryOpp && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STAGES[primaryOpp.stage]?.color ?? 'bg-gray-50'} ${STAGES[primaryOpp.stage]?.textColor ?? 'text-gray-600'}`}>
                        {STAGES[primaryOpp.stage]?.label ?? primaryOpp.stage}
                      </span>
                      {primaryOpp.value_estimate != null && (
                        <span className="text-xs font-semibold text-[var(--green-700)]">£{primaryOpp.value_estimate.toLocaleString('en-GB')}</span>
                      )}
                    </div>
                    {/* Compact progress bar */}
                    {(() => {
                      const CLOSED = ['lost', 'closed_not_interested']
                      const PAUSED = ['on_hold']
                      const active = STAGE_ORDER.filter(s => !CLOSED.includes(s) && !PAUSED.includes(s))
                      const idx = active.indexOf(primaryOpp.stage)
                      const pct = CLOSED.includes(primaryOpp.stage) ? 100 : PAUSED.includes(primaryOpp.stage) ? 50 : idx >= 0 ? Math.round(((idx + 1) / active.length) * 100) : 0
                      const barColor = CLOSED.includes(primaryOpp.stage) ? 'bg-red-400' : PAUSED.includes(primaryOpp.stage) ? 'bg-slate-300' : 'bg-[var(--green-500)]'
                      return (
                        <div className="h-1 bg-[var(--warm-100)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Project chips — from parsedNotes.fields array */}
                <div className="flex flex-wrap gap-1.5">
                  {parsedNotes.fields.length === 0 ? (
                    <span className="text-xs text-[var(--warm-300)] italic">No project details yet</span>
                  ) : (
                    parsedNotes.fields.map(f => (
                      <span key={f.label} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--warm-50)] border border-[var(--warm-100)] rounded-full text-[10px] text-[var(--warm-600)]">
                        {f.label}: {f.value}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Section: AI Insights */}
              {suggestionsOn && (
                <>
                  <hr className="border-[var(--warm-100)]" />
                  <div className="p-4">
                    <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-3">AI Insights</p>
                    {suggestLoading || summaryLoading ? (
                      <div className="space-y-2">
                        <div className="h-3 bg-[var(--warm-100)] rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-[var(--warm-100)] rounded animate-pulse w-1/2" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {aiSuggestion && (
                          <p className="text-xs text-[var(--warm-700)] leading-relaxed">{aiSuggestion.action}</p>
                        )}
                        {activitySummary && (
                          <p className="text-xs text-[var(--warm-500)] leading-relaxed">{activitySummary.narrative}</p>
                        )}
                        {!aiSuggestion && !activitySummary && (
                          <p className="text-xs text-[var(--warm-300)] italic">No insights yet</p>
                        )}
                      </div>
                    )}

                    {/* Snooze nudges */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--warm-50)]">
                      <div className="flex items-center gap-1.5">
                        <BellOff size={11} className="text-[var(--warm-300)]" />
                        <span className="text-[10px] text-[var(--warm-400)]">Snooze</span>
                      </div>
                      {lead.snoozed_until && isFuture(new Date(lead.snoozed_until)) ? (
                        <button
                          onClick={() => updateLead.mutate({ id: lead.id, snoozed_until: null as unknown as string })}
                          className="text-[10px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          Until {format(new Date(lead.snoozed_until), 'dd MMM')} · Unsnooze
                        </button>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          {[{ label: '1d', days: 1 }, { label: '3d', days: 3 }, { label: '7d', days: 7 }, { label: '14d', days: 14 }].map(opt => (
                            <button key={opt.days}
                              onClick={() => updateLead.mutate({ id: lead.id, snoozed_until: addDays(new Date(), opt.days).toISOString() })}
                              className="px-2 py-0.5 text-[10px] font-medium text-[var(--warm-500)] hover:text-[var(--green-700)] hover:bg-[var(--green-50)] rounded-md transition-colors"
                            >{opt.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Section: Smart Actions */}
              {suggestionsOn && (
                <>
                  <hr className="border-[var(--warm-100)]" />
                  <div className="p-4">
                    <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-3">Suggested Actions</p>
                    <SmartActions
                      lead={lead}
                      opportunities={leadOpportunities}
                      bookings={bookings}
                      tasks={tasks}
                      messages={messages}
                      onCompose={(channel, templateHint) => {
                        const firstName = lead.name?.split(' ')[0] ?? ''
                        const bodyMap: Record<string, string> = {
                          'follow-up': `Hi ${firstName},\n\nJust following up on our recent conversation.\n\nBest regards`,
                          'send-quote': `Hi ${firstName},\n\nPlease find attached the quote we discussed.\n\nBest regards`,
                          'payment-reminder': `Hi ${firstName},\n\nFriendly reminder regarding the outstanding invoice.\n\nBest regards`,
                          'booking-confirm': `Hi ${firstName},\n\nJust confirming your upcoming appointment.\n\nBest regards`,
                        }
                        setComposeState({
                          open: true,
                          channel: channel as MessageChannel,
                          body: bodyMap[templateHint] || `Hi ${firstName},\n\n\n\nBest regards`,
                          subject: channel === 'email' ? `Re: ${templateHint.replace(/-/g, ' ')}` : undefined,
                          intent: templateHint,
                        })
                      }}
                      onScheduleCall={() => router.push('/crm/calendar')}
                    />
                  </div>
                </>
              )}

              {/* Section: Discovery answers */}
              <hr className="border-[var(--warm-100)]" />
              <div className="p-4">
                <DiscoveryAnswersCard
                  meet1Notes={meet1Notes}
                  isLoading={meet1Loading}
                  opportunityId={primaryOpp?.id ?? null}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Right column — tabbed content */}
        <div className="flex-1 min-w-0 border-2 border-red-500">
          {/* Tabs with sliding underline.
              On screens < sm: only primary tabs are shown inline; secondary tabs
              are accessible via a "More" dropdown to prevent horizontal overflow. */}
          {/* ── Pill Tab Bar ─────────────────────────────────────────── */}
          {(() => {
            const PRIMARY_TABS: Tab[] = ['overview', 'contact', 'pipeline', 'comms', 'money', 'tasks']
            const primaryTabs = tabs.filter((t) => PRIMARY_TABS.includes(t.key))
            const secondaryTabs = tabs.filter((t) => !PRIMARY_TABS.includes(t.key))
            const activeIsSecondary = secondaryTabs.some((t) => t.key === activeTab)

            return (
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {primaryTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                      activeTab === t.key
                        ? 'bg-[var(--green-50)] text-[var(--green-700)] border border-[var(--green-200)] shadow-sm'
                        : 'text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-white border border-transparent'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                    {t.count != null && t.count > 0 && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0 font-semibold ${
                        activeTab === t.key ? 'bg-[var(--green-100)] text-[var(--green-700)]' : 'bg-[var(--warm-100)] text-[var(--warm-400)]'
                      }`}>
                        {t.count}
                      </span>
                    )}
                    {t.draftCount != null && t.draftCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--green-500)] border-2 border-white" title={`${t.draftCount} AI draft${t.draftCount > 1 ? 's' : ''} ready`} />
                    )}
                  </button>
                ))}

                {/* ··· More dropdown for secondary tabs */}
                <div className="relative" ref={moreTabRef}>
                  <button
                    onClick={() => setMoreTabOpen((v) => !v)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all border ${
                      activeIsSecondary
                        ? 'bg-[var(--green-50)] text-[var(--green-700)] border-[var(--green-200)]'
                        : 'text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-white border-transparent'
                    }`}
                  >
                    {activeIsSecondary ? tabs.find((t) => t.key === activeTab)?.label : '···'}
                    <ChevronDown size={10} className={`transition-transform ${moreTabOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {moreTabOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.1 }}
                        className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-[var(--warm-100)] rounded-xl shadow-lg py-1 min-w-[140px]"
                      >
                        {secondaryTabs.map((t) => (
                          <button
                            key={t.key}
                            onClick={() => { setActiveTab(t.key); setMoreTabOpen(false) }}
                            className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors ${
                              activeTab === t.key ? 'text-[var(--green-700)] bg-[var(--green-50)]' : 'text-[var(--warm-600)] hover:bg-[var(--warm-50)]'
                            }`}
                          >
                            {t.icon} {t.label}
                            {t.count != null && t.count > 0 && (
                              <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 bg-[var(--warm-100)] text-[var(--warm-500)]">{t.count}</span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })()}

          {/* Tab content — no outer card, sections define their own blocks */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
                {activeTab === 'overview' && (
                  <OverviewTab
                    stageLog={stageLog}
                    messages={messages}
                    tasks={tasks}
                    bookings={bookings}
                    payments={payments}
                    leadCreatedAt={lead.created_at}
                    emailMessages={emailMessages}
                    onAddTask={() => setActiveTab('tasks')}
                  />
                )}
                {activeTab === 'contact' && (
                  <div className="bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden">
                    <ContactTab lead={lead} />
                  </div>
                )}
                {activeTab === 'pipeline' && (
                  <div className="bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden">
                    <OpportunitiesTab opportunities={leadOpportunities} leadId={id} />
                  </div>
                )}
                {activeTab === 'comms' && (
                  <div className="bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden">
                    <CommsTab
                      messages={messages}
                      drafts={messageDrafts}
                      leadId={id}
                      preferredChannel={lead?.preferred_channel ?? null}
                      bookings={bookings}
                      leadName={lead?.name ?? ''}
                    />
                  </div>
                )}
                {activeTab === 'money' && (
                  <div className="bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden">
                    <MoneyTab invoices={invoices} payments={payments} />
                  </div>
                )}
                {activeTab === 'tasks' && (
                  <div className="bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden">
                    <TasksTab tasks={tasks} leadId={id} primaryOppId={primaryOpp?.id ?? null} />
                  </div>
                )}
                {activeTab === 'notes' && (
                  <div className="bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden">
                    <LeadNotesTab leadId={id} existingNotes={lead?.notes ?? null} />
                  </div>
                )}
                {activeTab === 'fitting' && (
                  <div className="bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden">
                    <FittingTab opportunityIds={leadOpportunities.map(o => o.id)} />
                  </div>
                )}
            </motion.div>
          </AnimatePresence>
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
  type EditableField = 'name' | 'email' | 'phone' | 'postcode' | 'notes_remainder' | 'address' | 'call_time' | 'relationship'
  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [fieldValue, setFieldValue] = useState('')

  // Chip-based fields stored inside notes
  const CHIP_FIELDS: Record<string, string> = { address: 'Address', call_time: 'Call time', relationship: 'Relationship' }

  function getChipValue(chipLabel: string): string | null {
    return noteChips.find(c => c.label.toLowerCase() === chipLabel.toLowerCase())?.value ?? null
  }

  function startEdit(field: EditableField, current: string | null) {
    setEditingField(field)
    setFieldValue(current ?? '')
  }

  function commitEdit(field: EditableField) {
    if (editingField !== field) return
    const patch: Record<string, string | null> = {}

    if (field === 'notes_remainder') {
      // Reconstruct notes: all chips + new remainder
      const allChips = noteChips.map(c => `${c.label}: ${c.value}`).join('\n')
      patch.notes = fieldValue.trim() ? `${allChips}\n${fieldValue.trim()}` : allChips || null
    } else if (field in CHIP_FIELDS) {
      // Update or remove a chip inside notes
      const chipLabel = CHIP_FIELDS[field]
      const otherChips = noteChips.filter(c => c.label.toLowerCase() !== chipLabel.toLowerCase())
      const newChips = fieldValue.trim()
        ? [...otherChips, { label: chipLabel, value: fieldValue.trim() }]
        : otherChips
      const chipsStr = newChips.map(c => `${c.label}: ${c.value}`).join('\n')
      patch.notes = chipsStr ? `${chipsStr}${noteRemainder ? '\n' + noteRemainder : ''}` : noteRemainder || null
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

  // Render helper — not a component, just a function returning JSX to avoid "component created during render" lint error
  function renderInlineField(field: EditableField, label: string, icon: React.ReactNode, value: string | null, multiline?: boolean) {
    const isEditing = editingField === field
    return (
      <div key={field} className="group">
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
        {renderInlineField('name',     'Name',     <User size={11} />,    lead.name)}
        {renderInlineField('email',    'Email',    <Mail size={11} />,    lead.email)}
        {renderInlineField('phone',    'Phone',    <Phone size={11} />,   lead.phone)}
        {renderInlineField('postcode', 'Postcode', <MapPin size={11} />,  lead.postcode)}
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

      {/* Extended contact fields */}
      <div className="pt-2 border-t border-[var(--warm-50)]">
        <h3 className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider mb-4">Additional Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {renderInlineField('address', 'Address', <MapPin size={11} />, getChipValue('Address'))}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider mb-1">
              <Clock size={11} /> Preferred Call Time
            </label>
            {editingField === 'call_time' ? (
              <select
                autoFocus
                value={fieldValue}
                onChange={e => setFieldValue(e.target.value)}
                onBlur={() => commitEdit('call_time')}
                className="w-full px-2.5 py-1.5 text-sm border border-[var(--green-300)] rounded-lg focus:border-[var(--green-500)] focus:outline-none bg-white shadow-sm"
              >
                <option value="">— clear —</option>
                <option value="Morning (9–12)">Morning (9–12)</option>
                <option value="Afternoon (12–5)">Afternoon (12–5)</option>
                <option value="Evening (5–8)">Evening (5–8)</option>
                <option value="Any">Any</option>
              </select>
            ) : (
              <button onClick={() => startEdit('call_time', getChipValue('Call time'))} className="w-full text-left flex items-center gap-2 group/val">
                <span className={`text-sm flex-1 ${getChipValue('Call time') ? 'text-[var(--warm-800)]' : 'text-[var(--warm-300)] italic'}`}>
                  {getChipValue('Call time') || 'Click to add'}
                </span>
                <Edit3 size={11} className="text-[var(--warm-300)] opacity-0 group-hover/val:opacity-100 transition-opacity shrink-0" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-5">
          {renderInlineField('relationship', 'Relationship Notes', <FileText size={11} />, getChipValue('Relationship'), true)}
        </div>
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

        {renderInlineField('notes_remainder', 'Additional notes', <FileText size={11} />, noteRemainder || null, true)}
      </div>
    </div>
  )
}

// ─── Opportunities Tab ───────────────────────────────────────────────────────

function OpportunitiesTab({ opportunities, leadId }: { opportunities: OpportunityWithLead[]; leadId: string }) {
  const createOpp = useCreateOpportunity()

  return (
    <div>
      <div className="divide-y divide-[var(--warm-50)]">
        {opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>

      {opportunities.length === 0 && (
        <div className="p-6 text-center text-sm text-[var(--warm-400)]">No opportunities yet.</div>
      )}

      <div className="p-4 border-t border-[var(--warm-100)]">
        <button
          onClick={() => createOpp.mutate({ lead_id: leadId, stage: 'new_enquiry' as OpportunityStage })}
          disabled={createOpp.isPending}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {createOpp.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          New opportunity
        </button>
      </div>
    </div>
  )
}

function OpportunityCard({ opp }: { opp: OpportunityWithLead }) {
  const updateOpp = useUpdateOpportunity()
  const moveStage = useMoveOpportunityStage()
  const [editingValue, setEditingValue] = useState(false)
  const [valueInput, setValueInput] = useState(String(opp.value_estimate ?? ''))
  const [lostReason, setLostReason] = useState(opp.lost_reason ?? '')
  const [confirmStage, setConfirmStage] = useState<OpportunityStage | null>(null)

  function handleStageSelect(stage: OpportunityStage) {
    if (stage === opp.stage) return
    setConfirmStage(stage)
  }

  function applyStageChange(withAutomations: boolean) {
    if (!confirmStage) return
    if (withAutomations) {
      // Full move: KPI timestamps + stage_log + automations (emails, tasks, invoices)
      moveStage.mutate({ id: opp.id, stage: confirmStage })
    } else {
      // Silent move: update stage only — no automations, no stage log entry
      updateOpp.mutate({ id: opp.id, stage: confirmStage })
    }
    setConfirmStage(null)
  }

  return (
    <div className="p-4 space-y-3">
      {/* Stage progress bar */}
      <StageProgressBar stage={opp.stage} />

      {/* Stage + value row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stage dropdown */}
        <select
          value={opp.stage}
          onChange={e => handleStageSelect(e.target.value as OpportunityStage)}
          className="text-xs font-medium border border-[var(--warm-200)] rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--brand)] bg-white"
        >
          {STAGE_ORDER.map(s => (
            <option key={s} value={s}>{STAGES[s]?.label ?? s}</option>
          ))}
        </select>

        {/* Value estimate */}
        {editingValue ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--warm-400)]">£</span>
            <input
              autoFocus
              type="number"
              value={valueInput}
              onChange={e => setValueInput(e.target.value)}
              onBlur={() => {
                const v = parseFloat(valueInput)
                if (!isNaN(v)) updateOpp.mutate({ id: opp.id, value_estimate: v })
                setEditingValue(false)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setEditingValue(false)
              }}
              className="w-24 px-2 py-0.5 text-xs border border-[var(--brand)] rounded-lg focus:outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => { setEditingValue(true); setValueInput(String(opp.value_estimate ?? '')) }}
            className="text-xs font-semibold text-[var(--green-700)] bg-[var(--green-50)] px-2 py-0.5 rounded-full hover:bg-[var(--green-100)] transition-colors"
          >
            {opp.value_estimate != null ? `£${opp.value_estimate.toLocaleString('en-GB')}` : '+ Add value'}
          </button>
        )}

        <span className="text-[10px] text-[var(--warm-400)] ml-auto">
          Updated {formatDistanceToNow(new Date(opp.updated_at), { addSuffix: true })}
        </span>
      </div>

      {/* Lost reason */}
      {opp.stage === 'lost' && (
        <div>
          <label className="text-[10px] text-[var(--warm-400)] font-medium">Lost reason</label>
          <input
            value={lostReason}
            onChange={e => setLostReason(e.target.value)}
            onBlur={() => updateOpp.mutate({ id: opp.id, lost_reason: (lostReason || null) as import('@/lib/crm/types').LostReason | null })}
            placeholder="Why was this lost?"
            className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--brand)]"
          />
        </div>
      )}

      {/* Stage change confirmation */}
      {confirmStage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800">
            Change stage to <strong>{STAGES[confirmStage]?.label ?? confirmStage}</strong>?
          </p>
          <p className="text-[11px] text-amber-700">This may trigger automations (emails, tasks, invoices).</p>
          <div className="flex gap-2">
            <button onClick={() => applyStageChange(true)}
              className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              Confirm + automations
            </button>
            <button onClick={() => applyStageChange(false)}
              className="px-3 py-1 text-xs font-medium bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
              Change only
            </button>
            <button onClick={() => setConfirmStage(null)}
              className="px-3 py-1 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Comms Tab (Messages + Bookings merged) ───────────────────────────────────

function CommsTab({ messages, drafts, leadId, preferredChannel, bookings, leadName }: {
  messages: MessageLog[]
  drafts?: import('@/lib/crm/hooks').MessageDraft[]
  leadId: string
  preferredChannel?: string | null
  bookings: Booking[]
  leadName: string
}) {
  const [bookingsOpen, setBookingsOpen] = useState(bookings.length > 0)

  return (
    <div>
      {/* Bookings section — collapsible */}
      {bookings.length > 0 && (
        <div className="border-b border-[var(--warm-100)]">
          <button
            onClick={() => setBookingsOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--warm-600)] hover:bg-[var(--warm-50)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Calendar size={12} /> Bookings ({bookings.length})
            </span>
            {bookingsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {bookingsOpen && (
            <div className="pb-2">
              <BookingsTab bookings={bookings} leadName={leadName} />
            </div>
          )}
        </div>
      )}
      {/* Messages thread */}
      <MessagesTab messages={messages} drafts={drafts} leadId={leadId} preferredChannel={preferredChannel} />
    </div>
  )
}

// ─── Bookings Tab ────────────────────────────────────────────────────────────

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

function MessagesTab({ messages, drafts = [], leadId, preferredChannel }: { messages: MessageLog[]; drafts?: import('@/lib/crm/hooks').MessageDraft[]; leadId: string; preferredChannel?: string | null }) {
  const { data: emailMessages = [] } = useEmailMessagesByLead(leadId)
  const { data: emailEvents = [] } = useEmailEventsByLead(leadId)
  const dismissDraft = useDismissDraft()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null)

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

  const channelColors: Record<string, string> = {
    email: 'bg-blue-50 text-blue-700',
    sms: 'bg-amber-50 text-amber-700',
    whatsapp: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-4">

        {/* AI Draft banner */}
        {drafts.length > 0 && (
          <div className="mb-2 space-y-2">
            {drafts.map((draft) => {
              const body = draft.metadata?.body ?? ''
              const subject = draft.metadata?.subject
              const isExpanded = expandedDraftId === draft.id
              return (
                <div key={draft.id} className="rounded-xl border border-[var(--green-200)] bg-[var(--green-50)] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Brain size={11} className="text-[var(--green-600)] shrink-0" />
                      <span className="text-[10px] font-semibold text-[var(--green-700)] uppercase tracking-wider">AI Draft</span>
                      <span className="text-[10px] text-[var(--warm-500)] truncate">{subject ?? draft.metadata?.intent ?? draft.channel}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setExpandedDraftId(isExpanded ? null : draft.id)}
                        className="text-[10px] text-[var(--green-700)] hover:underline"
                      >
                        {isExpanded ? 'Hide' : 'Preview'}
                      </button>
                      <button
                        onClick={() => dismissDraft.mutate({ draftId: draft.id, leadId })}
                        className="text-[10px] text-[var(--warm-400)] hover:text-[var(--warm-600)] ml-1"
                        title="Dismiss draft"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <p className="mt-2 text-[11px] text-[var(--warm-700)] whitespace-pre-wrap border-t border-[var(--green-100)] pt-2">
                      {body}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {unified.length === 0 && drafts.length === 0 && (
          <p className="text-sm text-[var(--warm-400)] text-center py-8">No messages yet</p>
        )}
        {unified.length === 0 && drafts.length > 0 && null}
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
      <InlineComposeBar leadId={leadId} preferredChannel={preferredChannel} />
    </div>
  )
}

// ─── Inline Compose Bar ──────────────────────────────────────────────────────

const COMPOSE_CHANNELS = [
  { value: 'email',    label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms',      label: 'SMS' },
] as const

function InlineComposeBar({ leadId, preferredChannel }: { leadId: string; preferredChannel?: string | null }) {
  const sendMessage = useSendMessage()
  const { data: templates = [] } = useMessageTemplates()
  const defaultChannel = COMPOSE_CHANNELS.find(c => c.value === preferredChannel)?.value ?? 'email'
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'sms'>(defaultChannel as 'email' | 'whatsapp' | 'sms')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const templateRef = useRef<HTMLDivElement>(null)

  // Close template picker on outside click
  useEffect(() => {
    if (!showTemplates) return
    function handler(e: MouseEvent) {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) setShowTemplates(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTemplates])

  const channelTemplates = templates.filter(t => t.channels.includes(channel as import('@/lib/crm/types').MessageChannel) && t.active)

  async function handleSend() {
    if (!body.trim()) return
    await sendMessage.mutateAsync({
      lead_id: leadId,
      channel,
      body: body.trim(),
      subject: channel === 'email' ? subject.trim() || undefined : undefined,
    })
    setBody('')
    setSubject('')
  }

  return (
    <div className="border-t border-[var(--warm-100)] bg-white p-3 space-y-2 shrink-0">
      <div className="flex items-center gap-2">
        <select
          value={channel}
          onChange={e => setChannel(e.target.value as typeof channel)}
          className="text-[11px] font-medium border border-[var(--warm-200)] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--brand)] bg-white shrink-0"
        >
          {COMPOSE_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {channel === 'email' && (
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-xs border border-[var(--warm-200)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--brand)]"
          />
        )}
        {/* Template picker */}
        <div className="relative shrink-0" ref={templateRef}>
          <button
            onClick={() => setShowTemplates(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
              showTemplates
                ? 'bg-[var(--green-50)] text-[var(--green-700)] border-[var(--green-200)]'
                : 'bg-white text-[var(--warm-500)] border-[var(--warm-200)] hover:border-[var(--warm-300)]'
            }`}
          >
            <FileText size={11} /> Templates
          </button>
          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 bottom-full mb-1.5 z-50 bg-white border border-[var(--warm-100)] rounded-xl shadow-lg py-1.5 min-w-[220px] max-h-60 overflow-y-auto"
              >
                {channelTemplates.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[var(--warm-400)]">No templates for this channel.</p>
                ) : (
                  channelTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setBody(t.body)
                        if (channel === 'email') setSubject(t.subject ?? '')
                        setShowTemplates(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--warm-700)] hover:bg-[var(--warm-50)] transition-colors"
                    >
                      <p className="font-medium">{t.name}</p>
                      {t.subject && <p className="text-[var(--warm-400)] truncate">{t.subject}</p>}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }}
          placeholder={`Quick ${channel} message… (⌘↵ to send)`}
          rows={2}
          className="flex-1 text-sm border border-[var(--warm-200)] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--brand)] resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sendMessage.isPending}
          className="px-3 py-2 bg-[var(--brand)] text-white text-xs font-medium rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1 self-end"
        >
          {sendMessage.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Send
        </button>
      </div>
    </div>
  )
}

// ─── Money Tab (Invoices + Payments merged) ───────────────────────────────────

function MoneyTab({ invoices, payments }: { invoices: Invoice[]; payments: Payment[] }) {
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.amount, 0)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      {/* Summary bar */}
      {invoices.length > 0 && (
        <div className="flex items-center gap-6 px-5 py-3 border-b border-[var(--warm-100)] bg-[var(--warm-50)]/50">
          <div>
            <p className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Invoiced</p>
            <p className="text-sm font-semibold text-[var(--warm-800)]">£{totalInvoiced.toLocaleString('en-GB')}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Paid</p>
            <p className="text-sm font-semibold text-emerald-700">£{totalPaid.toLocaleString('en-GB')}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[var(--warm-400)] uppercase tracking-wider">Outstanding</p>
            <p className={`text-sm font-semibold ${totalInvoiced - totalPaid > 0 ? 'text-amber-600' : 'text-[var(--warm-400)]'}`}>
              £{(totalInvoiced - totalPaid).toLocaleString('en-GB')}
            </p>
          </div>
        </div>
      )}
      <InvoicesTab invoices={invoices} />
      {payments.length > 0 && (
        <div className="border-t border-[var(--warm-100)]">
          <p className="px-5 py-3 text-[10px] font-semibold text-[var(--warm-500)] uppercase tracking-wider">Payments</p>
          <div className="divide-y divide-[var(--warm-50)]">
            {payments.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--warm-800)]">£{p.amount.toLocaleString('en-GB')}</p>
                  {p.method && <p className="text-xs text-[var(--warm-400)] capitalize">{p.method}</p>}
                </div>
                <span className="text-xs text-[var(--warm-400)]">{format(new Date(p.paid_at), 'dd MMM yyyy')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Invoices Tab ────────────────────────────────────────────────────────────

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

const TASK_TYPES = ['call_back', 'send_quote', 'follow_up', 'site_visit', 'send_contract', 'other'] as const

function TasksTab({ tasks, leadId, primaryOppId }: { tasks: Task[]; leadId: string; primaryOppId: string | null }) {
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const { data: profiles = [] } = useProfiles()
  const { profile: currentProfile } = useCurrentProfile()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'follow_up',
    description: '',
    due_at: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    owner_user_id: currentProfile?.id ?? '',
    link_to: 'opportunity' as 'opportunity' | 'lead',
  })

  async function handleCreate() {
    await createTask.mutateAsync({
      type: form.type,
      description: form.description || null,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      owner_user_id: form.owner_user_id || null,
      opportunity_id: form.link_to === 'opportunity' ? primaryOppId : null,
      lead_id: form.link_to === 'lead' ? leadId : null,
    })
    setShowForm(false)
    setForm(f => ({ ...f, description: '', type: 'follow_up' }))
  }

  return (
    <div>
      {/* Add task button / form */}
      <div className="p-4 border-b border-[var(--warm-100)]">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:opacity-80 transition-opacity"
          >
            <Plus size={13} /> Add task
          </button>
        ) : (
          <div className="space-y-3 bg-[var(--warm-50)] rounded-xl p-3">
            <p className="text-[11px] font-semibold text-[var(--warm-600)]">New task</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--warm-400)] font-medium">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full mt-0.5 px-2 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--brand)] bg-white capitalize">
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--warm-400)] font-medium">Due date</label>
                <input type="date" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))}
                  className="w-full mt-0.5 px-2 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--brand)] bg-white" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--warm-400)] font-medium">Assignee</label>
                <select value={form.owner_user_id} onChange={e => setForm(f => ({ ...f, owner_user_id: e.target.value }))}
                  className="w-full mt-0.5 px-2 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--brand)] bg-white">
                  <option value="">Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--warm-400)] font-medium">Link to</label>
                <select value={form.link_to} onChange={e => setForm(f => ({ ...f, link_to: e.target.value as 'opportunity' | 'lead' }))}
                  className="w-full mt-0.5 px-2 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--brand)] bg-white">
                  <option value="opportunity">Primary opportunity</option>
                  <option value="lead">Lead only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[var(--warm-400)] font-medium">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Add details…"
                className="w-full mt-0.5 px-2 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:outline-none focus:border-[var(--brand)] resize-none bg-white" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)]">Cancel</button>
              <button onClick={handleCreate} disabled={createTask.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--brand)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                {createTask.isPending && <Loader2 size={11} className="animate-spin" />}
                Create task
              </button>
            </div>
          </div>
        )}
      </div>

      {tasks.length === 0 && !showForm ? (
        <EmptyTab message="No tasks" />
      ) : (
        <div className="divide-y divide-[var(--warm-50)]">
          {tasks.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTask.mutate({ id: t.id, status: t.status === 'open' ? 'done' : 'open' })}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                    t.status === 'done'
                      ? 'bg-[var(--green-600)] border-[var(--green-600)] text-white'
                      : 'border-[var(--warm-300)] hover:border-[var(--green-500)]'
                  }`}
                >
                  {t.status === 'done' && <CheckSquare size={12} />}
                </button>
                <div>
                  <span className={`text-sm capitalize ${t.status === 'done' ? 'text-[var(--warm-400)] line-through' : 'text-[var(--warm-800)]'}`}>
                    {t.type.replace('_', ' ')}
                  </span>
                  {t.description && (
                    <p className="text-xs text-[var(--warm-400)] mt-0.5">{t.description}</p>
                  )}
                </div>
              </div>
              {t.due_at && (
                <span className="text-xs text-[var(--warm-400)] shrink-0">
                  {format(new Date(t.due_at), 'dd MMM')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
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
    completed_at: string | null; customer_signed_at: string | null;
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (opportunityIds.length === 0) { setLoading(false); return }
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('fitting_jobs')
        .select('id, job_code, status, scheduled_date, customer_name, fitting_fee, scope_of_work, completed_at, customer_signed_at, subcontractors(name)')
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
        <Link key={job.id} href={`/crm/fittings?job=${job.id}`} className="block bg-white rounded-xl border border-[var(--warm-100)] p-4 hover:border-[var(--warm-200)] transition-colors">
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
          {(job.completed_at || job.customer_signed_at) && (
            <div className="flex gap-3 mt-2 text-[10px] text-[var(--warm-400)]">
              {job.completed_at && <span>Completed: {format(new Date(job.completed_at), 'dd MMM HH:mm')}</span>}
              {job.customer_signed_at && <span>Signed off: {format(new Date(job.customer_signed_at), 'dd MMM HH:mm')}</span>}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}

