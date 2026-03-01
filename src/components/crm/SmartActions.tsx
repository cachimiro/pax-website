'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  Mail,
  Calendar,
  Send,
  CreditCard,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { Lead, OpportunityWithLead, Booking, Task, MessageLog } from '@/lib/crm/types'

interface SmartActionsProps {
  lead: Lead
  opportunities: OpportunityWithLead[]
  bookings: Booking[]
  tasks: Task[]
  messages: MessageLog[]
  onCompose: (channel: 'email' | 'whatsapp', templateHint: string) => void
  onScheduleCall: () => void
}

interface SmartAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  color: string // bg class
  iconColor: string
  onClick: () => void
  priority: number // lower = more important
}

export default function SmartActions({
  lead,
  opportunities,
  bookings,
  tasks,
  messages,
  onCompose,
  onScheduleCall,
}: SmartActionsProps) {
  const [expanded, setExpanded] = useState(true)

  const activeOpp = useMemo(() => {
    return opportunities
      .filter((o) => o.stage !== 'lost' && o.stage !== 'complete')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  }, [opportunities])

  const actions = useMemo<SmartAction[]>(() => {
    const result: SmartAction[] = []
    const stage = activeOpp?.stage
    const hasEmail = !!lead.email
    const hasPhone = !!lead.phone
    const isOptedOut = lead.opted_out

    const openTasks = tasks.filter((t) => t.status === 'open')
    const sentMessages = messages.filter((m) => m.status === 'sent' || m.status === 'delivered')
    const lastMessage = sentMessages[0]
    const lastMessageAge = lastMessage
      ? (Date.now() - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60)
      : Infinity

    const hasBooking = (type: string) => bookings.some((b) => b.type === type)
    const hasSentTemplate = (tpl: string) => sentMessages.some((m) => m.template === tpl)

    // ── New enquiry, no call booked ──
    if (!stage || stage === 'new_enquiry') {
      if (!hasBooking('call1') && hasPhone) {
        result.push({
          id: 'schedule-call1',
          label: 'Schedule Call 1',
          description: 'Book the initial consultation call',
          icon: <Phone size={15} />,
          color: 'bg-blue-50',
          iconColor: 'text-blue-600',
          onClick: onScheduleCall,
          priority: 1,
        })
      }
      if (!hasSentTemplate('welcome') && !isOptedOut) {
        if (hasEmail) {
          result.push({
            id: 'send-welcome',
            label: 'Send welcome email',
            description: 'Introduce yourself and confirm enquiry',
            icon: <Mail size={15} />,
            color: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            onClick: () => onCompose('email', 'welcome'),
            priority: 2,
          })
        }
      }
    }

    // ── Call 1 scheduled, not yet qualified ──
    if (stage === 'call1_scheduled') {
      if (!hasSentTemplate('call1_followup') && !isOptedOut && hasEmail) {
        result.push({
          id: 'send-followup',
          label: 'Send follow-up summary',
          description: 'Recap the call and next steps',
          icon: <Send size={15} />,
          color: 'bg-violet-50',
          iconColor: 'text-violet-600',
          onClick: () => onCompose('email', 'call1_followup'),
          priority: 1,
        })
      }
    }

    // ── Qualified / proposal stage ──
    if (stage === 'qualified' || stage === 'call2_scheduled') {
      if (stage === 'call2_scheduled' && lastMessageAge > 48 && !isOptedOut) {
        const channel = lead.preferred_channel === 'whatsapp' && hasPhone ? 'whatsapp' : 'email'
        if (hasEmail || hasPhone) {
          result.push({
            id: 'nudge-proposal',
            label: 'Follow up on proposal',
            description: `No response in ${Math.round(lastMessageAge / 24)} days`,
            icon: <Send size={15} />,
            color: 'bg-amber-50',
            iconColor: 'text-amber-600',
            onClick: () => onCompose(channel, 'proposal_followup'),
            priority: 1,
          })
        }
      }
    }

    // ── Proposal agreed, awaiting deposit ──
    if (stage === 'proposal_agreed') {
      if (!isOptedOut && (hasEmail || hasPhone)) {
        result.push({
          id: 'send-deposit-reminder',
          label: 'Send deposit reminder',
          description: 'Nudge toward securing the booking',
          icon: <CreditCard size={15} />,
          color: 'bg-green-50',
          iconColor: 'text-green-600',
          onClick: () => onCompose(hasEmail ? 'email' : 'whatsapp', 'deposit_reminder'),
          priority: 1,
        })
      }
    }

    // ── Deposit paid ──
    if (stage === 'deposit_paid') {
      if (!hasBooking('onboarding')) {
        result.push({
          id: 'schedule-onboarding',
          label: 'Schedule onboarding',
          description: 'Book the measurement and planning session',
          icon: <Calendar size={15} />,
          color: 'bg-purple-50',
          iconColor: 'text-purple-600',
          onClick: onScheduleCall,
          priority: 1,
        })
      }
      if (!hasSentTemplate('deposit_confirmation') && !isOptedOut && hasEmail) {
        result.push({
          id: 'send-deposit-confirm',
          label: 'Send deposit confirmation',
          description: 'Confirm payment received',
          icon: <Mail size={15} />,
          color: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
          onClick: () => onCompose('email', 'deposit_confirmation'),
          priority: 2,
        })
      }
    }

    // ── Overdue tasks (any stage) ──
    if (openTasks.length > 0) {
      result.push({
        id: 'overdue-tasks',
        label: `${openTasks.length} open task${openTasks.length > 1 ? 's' : ''}`,
        description: 'Review and complete pending tasks',
        icon: <ClipboardList size={15} />,
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        onClick: () => {
          document.querySelector('[data-tab="tasks"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        },
        priority: 3,
      })
    }

    return result.sort((a, b) => a.priority - b.priority).slice(0, 3)
  }, [lead, activeOpp, bookings, tasks, messages, onCompose, onScheduleCall])

  if (actions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-4 card-hover-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--warm-700)]">All caught up</p>
            <p className="text-[10px] text-[var(--warm-400)]">No actions needed right now</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] overflow-hidden card-hover-border">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--warm-50)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center">
            <Sparkles size={12} className="text-[var(--green-600)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--warm-700)]">Suggested actions</span>
          <span className="text-[9px] text-[var(--warm-300)] bg-[var(--warm-50)] px-1.5 py-0.5 rounded-full">
            {actions.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[var(--warm-300)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--warm-300)]" />
        )}
      </button>

      {/* Actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              {actions.map((action, i) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--warm-50)] active:scale-[0.98] transition-all text-left group"
                >
                  <div className={`w-8 h-8 rounded-xl ${action.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <span className={action.iconColor}>{action.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--warm-700)] group-hover:text-[var(--green-700)] transition-colors">
                      {action.label}
                    </p>
                    <p className="text-[10px] text-[var(--warm-400)] truncate">{action.description}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[var(--warm-50)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <ChevronDown size={10} className="text-[var(--warm-400)] -rotate-90" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
