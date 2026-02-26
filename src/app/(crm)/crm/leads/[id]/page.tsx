'use client'

import { useState } from 'react'
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
} from '@/lib/crm/hooks'
import StatusBadge from '@/components/crm/StatusBadge'
import ActivityTimeline from '@/components/crm/ActivityTimeline'
import { useAIScore, useAISuggestion } from '@/lib/crm/ai-hooks'
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
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

type Tab = 'contact' | 'opportunities' | 'bookings' | 'messages' | 'invoices' | 'tasks' | 'activity'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('contact')

  const { data: lead, isLoading } = useLead(id)
  const { data: opportunities = [] } = useOpportunities()
  const { data: bookings = [] } = useBookingsByLead(id)
  const { data: messages = [] } = useMessageLogs(id)
  const { data: invoices = [] } = useInvoicesByLead(id)
  const { data: tasks = [] } = useTasksByLead(id)

  const leadOpportunities = opportunities.filter((o) => o.lead_id === id)
  const opportunityIds = leadOpportunities.map((o) => o.id)
  const invoiceIds = invoices.map((inv) => inv.id)

  const { data: stageLog = [] } = useStageLogByOpportunityIds(opportunityIds)
  const { data: payments = [] } = usePaymentsByLead(invoiceIds)

  // GPT-powered AI scoring & suggestions
  const primaryOpp = leadOpportunities[0] ?? null
  const { data: aiScore, isLoading: scoreLoading } = useAIScore(lead, primaryOpp)
  const { data: aiSuggestion, isLoading: suggestLoading } = useAISuggestion(
    lead, primaryOpp, tasks, bookings, messages
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
      {/* Back */}
      <button
        onClick={() => router.push('/crm/leads')}
        className="flex items-center gap-1.5 text-sm text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Back to leads
      </button>

      {/* Hero header */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center text-lg font-bold text-[var(--green-700)] shrink-0">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">{lead.name}</h1>
              {scoreLoading ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--warm-50)] text-[var(--warm-400)]">
                  <Loader2 size={10} className="animate-spin" /> Scoring...
                </span>
              ) : aiScore ? (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  aiScore.tier === 'hot' ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200' :
                  aiScore.tier === 'warm' ? 'text-amber-700 bg-amber-50 ring-1 ring-amber-200' :
                  'text-[var(--warm-500)] bg-[var(--warm-50)] ring-1 ring-[var(--warm-200)]'
                }`}>
                  <Brain size={10} />
                  {aiScore.score} — {aiScore.tier}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusColors[lead.status]}`}>
                {lead.status}
              </span>
              {lead.email && (
                <span className="flex items-center gap-1 text-xs text-[var(--warm-500)]">
                  <Mail size={11} className="text-[var(--warm-300)]" /> {lead.email}
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1 text-xs text-[var(--warm-500)]">
                  <Phone size={11} className="text-[var(--warm-300)]" /> {lead.phone}
                </span>
              )}
              {lead.postcode && (
                <span className="flex items-center gap-1 text-xs text-[var(--warm-500)]">
                  <MapPin size={11} className="text-[var(--warm-300)]" /> {lead.postcode}
                </span>
              )}
              <span className="text-xs text-[var(--warm-400)]">
                Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* GPT AI Insights */}
        {(suggestLoading || aiSuggestion || aiScore) && (
          <div className="mt-4 space-y-3">
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

            {/* AI Score Breakdown + Closing Tip */}
            {aiScore && (
              <div className="px-4 py-3 rounded-xl border border-[var(--warm-100)] bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={12} className="text-[var(--green-600)]" />
                  <span className="text-[11px] font-semibold text-[var(--warm-700)]">AI Score Breakdown</span>
                  <span className="text-[10px] text-[var(--warm-400)] ml-auto">Powered by GPT</span>
                </div>
                <p className="text-xs text-[var(--warm-600)] mb-2">{aiScore.summary}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
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
                      {f.insight && <p className="text-[9px] text-[var(--warm-400)] mt-0.5">{f.insight}</p>}
                    </div>
                  ))}
                </div>
                {aiScore.closing_tip && (
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t border-[var(--warm-50)]">
                    <Target size={10} className="text-[var(--green-600)] mt-0.5 shrink-0" />
                    <p className="text-[11px] text-[var(--warm-600)]">
                      <span className="font-semibold">Closing tip:</span> {aiScore.closing_tip}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs — pill style */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all
              ${activeTab === tab.key
                ? 'bg-[var(--green-600)] text-white shadow-sm'
                : 'text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-[var(--warm-50)]'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`ml-0.5 text-[10px] rounded-full px-1.5 py-0.5 ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-[var(--warm-100)] text-[var(--warm-500)]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
            />
          </div>
        )}
        {activeTab === 'opportunities' && <OpportunitiesTab opportunities={leadOpportunities} />}
        {activeTab === 'bookings' && <BookingsTab bookings={bookings} />}
        {activeTab === 'messages' && <MessagesTab messages={messages} />}
        {activeTab === 'invoices' && <InvoicesTab invoices={invoices} />}
        {activeTab === 'tasks' && <TasksTab tasks={tasks} />}
      </div>
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

function BookingsTab({ bookings }: { bookings: Booking[] }) {
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
  }

  return (
    <div className="divide-y divide-[var(--warm-50)]">
      {bookings.map((b) => (
        <div key={b.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[b.type] ?? ''}`}>
              {b.type}
            </span>
            <span className="text-sm text-[var(--warm-700)]">
              {format(new Date(b.scheduled_at), 'dd MMM yyyy, HH:mm')}
            </span>
            <span className="text-xs text-[var(--warm-400)]">{b.duration_min}min</span>
          </div>
          <span className={`text-xs font-medium capitalize ${outcomeColors[b.outcome] ?? ''}`}>
            {b.outcome}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Messages Tab ────────────────────────────────────────────────────────────

import type { MessageLog } from '@/lib/crm/types'

function MessagesTab({ messages }: { messages: MessageLog[] }) {
  if (messages.length === 0) {
    return <EmptyTab message="No messages sent" />
  }

  const channelColors: Record<string, string> = {
    email: 'bg-blue-50 text-blue-700',
    sms: 'bg-amber-50 text-amber-700',
    whatsapp: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <div className="divide-y divide-[var(--warm-50)]">
      {messages.map((m) => (
        <div key={m.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${channelColors[m.channel] ?? ''}`}>
              {m.channel}
            </span>
            <span className="text-sm text-[var(--warm-700)]">{m.template ?? 'Custom'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--warm-400)]">{m.status}</span>
            <span className="text-xs text-[var(--warm-300)]">
              {format(new Date(m.sent_at), 'dd MMM, HH:mm')}
            </span>
          </div>
        </div>
      ))}
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
