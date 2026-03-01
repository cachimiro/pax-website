'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowRight, Mail, Phone, Calendar, CheckSquare, CreditCard, AlertTriangle, User, Inbox } from 'lucide-react'
import type { StageLog, MessageLog, Task, Booking, Payment, EmailMessage } from '@/lib/crm/types'
import { STAGES } from '@/lib/crm/stages'

interface TimelineEvent {
  id: string
  type: 'stage' | 'message' | 'task' | 'booking' | 'payment' | 'created' | 'email_reply'
  title: string
  description?: string
  timestamp: Date
  icon: React.ReactNode
  color: string
}

interface Props {
  stageLog: StageLog[]
  messages: MessageLog[]
  tasks: Task[]
  bookings: Booking[]
  payments: Payment[]
  leadCreatedAt: string
  emailMessages?: EmailMessage[]
}

export default function ActivityTimeline({ stageLog, messages, tasks, bookings, payments, leadCreatedAt, emailMessages = [] }: Props) {
  const events = useMemo(() => {
    const all: TimelineEvent[] = []

    // Lead created
    all.push({
      id: 'created',
      type: 'created',
      title: 'Lead created',
      description: 'Enquiry received',
      timestamp: new Date(leadCreatedAt),
      icon: <User size={12} />,
      color: 'bg-[var(--green-50)] text-[var(--green-600)]',
    })

    // Stage changes
    for (const log of stageLog) {
      const fromLabel = log.from_stage ? (STAGES[log.from_stage]?.label ?? log.from_stage) : 'New'
      const toLabel = STAGES[log.to_stage]?.label ?? log.to_stage
      all.push({
        id: `stage-${log.id}`,
        type: 'stage',
        title: `Moved to ${toLabel}`,
        description: `From ${fromLabel}`,
        timestamp: new Date(log.changed_at),
        icon: <ArrowRight size={12} />,
        color: log.to_stage === 'lost' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600',
      })
    }

    // Messages
    for (const msg of messages) {
      all.push({
        id: `msg-${msg.id}`,
        type: 'message',
        title: `${msg.channel} sent`,
        description: msg.template?.replace(/_/g, ' '),
        timestamp: new Date(msg.sent_at),
        icon: msg.channel === 'email' ? <Mail size={12} /> : <Phone size={12} />,
        color: msg.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
      })
    }

    // Tasks completed
    for (const task of tasks.filter((t) => t.status === 'done')) {
      all.push({
        id: `task-${task.id}`,
        type: 'task',
        title: `Task completed`,
        description: task.type.replace(/_/g, ' '),
        timestamp: new Date(task.due_at ?? task.created_at),
        icon: <CheckSquare size={12} />,
        color: 'bg-emerald-50 text-emerald-600',
      })
    }

    // Bookings
    for (const booking of bookings) {
      all.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        title: `${booking.type} booked`,
        description: format(new Date(booking.scheduled_at), 'dd MMM HH:mm'),
        timestamp: new Date(booking.created_at),
        icon: <Calendar size={12} />,
        color: 'bg-purple-50 text-purple-600',
      })
    }

    // Payments
    for (const payment of payments) {
      all.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        title: `Payment received`,
        description: `£${payment.amount?.toLocaleString('en-GB')}`,
        timestamp: new Date(payment.paid_at),
        icon: <CreditCard size={12} />,
        color: 'bg-emerald-50 text-emerald-700',
      })
    }

    // Inbound email replies
    for (const em of emailMessages.filter((e) => e.direction === 'inbound')) {
      all.push({
        id: `email-reply-${em.id}`,
        type: 'email_reply',
        title: 'Email reply received',
        description: em.subject ?? em.snippet?.slice(0, 60) ?? 'Reply from lead',
        timestamp: new Date(em.received_at),
        icon: <Inbox size={12} />,
        color: 'bg-orange-50 text-orange-600',
      })
    }

    return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [stageLog, messages, tasks, bookings, payments, leadCreatedAt, emailMessages])

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-[var(--warm-300)]">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--warm-100)]" />

      <div className="space-y-0">
        {events.map((event, i) => (
          <div key={event.id} className="relative flex items-start gap-3 py-2.5 pl-1">
            {/* Dot */}
            <div className={`relative z-10 w-8 h-8 rounded-lg ${event.color} flex items-center justify-center shrink-0`}>
              {event.icon}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs font-medium text-[var(--warm-800)]">{event.title}</p>
              {event.description && (
                <p className="text-[11px] text-[var(--warm-400)] truncate">{event.description}</p>
              )}
              <p className="text-[9px] text-[var(--warm-300)] mt-0.5">
                {format(event.timestamp, 'dd MMM yyyy HH:mm')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
