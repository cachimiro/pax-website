'use client'

import { format } from 'date-fns'
import { CheckSquare, Calendar, Plus } from 'lucide-react'
import ActivityTimeline from '@/components/crm/ActivityTimeline'
import type { StageLog, MessageLog, Task, Booking, Payment, EmailMessage } from '@/lib/crm/types'
import { useUpdateTask } from '@/lib/crm/hooks'

interface Props {
  stageLog: StageLog[]
  messages: MessageLog[]
  tasks: Task[]
  bookings: Booking[]
  payments: Payment[]
  leadCreatedAt: string
  emailMessages: EmailMessage[]
  onAddTask: () => void
}


export default function OverviewTab({
  stageLog, messages, tasks, bookings, payments, leadCreatedAt, emailMessages, onAddTask,
}: Props) {
  const updateTask = useUpdateTask()

  const openTasks = tasks.filter(t => t.status === 'open').slice(0, 3)
  const nextBooking = bookings
    .filter(b => b.outcome === 'pending' && new Date(b.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  return (
    <div className="p-6 space-y-6">
      {/* Open tasks widget */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider">Open Tasks</h3>
          <button
            onClick={onAddTask}
            className="flex items-center gap-1 text-xs text-[var(--green-600)] hover:text-[var(--green-700)] font-medium transition-colors"
          >
            <Plus size={11} /> Add
          </button>
        </div>
        {openTasks.length === 0 ? (
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)]">
            <span className="text-xs text-[var(--warm-400)]">No open tasks</span>
            <button onClick={onAddTask} className="text-xs text-[var(--green-600)] hover:underline font-medium">Add task</button>
          </div>
        ) : (
          <div className="space-y-2">
            {openTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)]">
                <button
                  onClick={() => updateTask.mutate({ id: t.id, status: 'done' })}
                  className="w-4 h-4 rounded border-2 border-[var(--warm-300)] hover:border-[var(--green-500)] flex items-center justify-center shrink-0 transition-colors"
                >
                  <CheckSquare size={10} className="opacity-0 hover:opacity-100" />
                </button>
                <span className="text-xs text-[var(--warm-700)] capitalize flex-1">{t.type.replace(/_/g, ' ')}</span>
                {t.due_at && (
                  <span className={`text-[10px] font-medium shrink-0 ${new Date(t.due_at) < new Date() ? 'text-red-500' : 'text-[var(--warm-400)]'}`}>
                    {format(new Date(t.due_at), 'dd MMM')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next booking */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider mb-3">Next Booking</h3>
        {nextBooking ? (
          <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-blue-50 border border-blue-100">
            <Calendar size={14} className="text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-800 capitalize">{nextBooking.type.replace(/_/g, ' ')}</p>
              <p className="text-[11px] text-blue-600">{format(new Date(nextBooking.scheduled_at), 'EEE dd MMM, HH:mm')} · {nextBooking.duration_min}min</p>
            </div>
            {nextBooking.meet_link && (
              <a href={nextBooking.meet_link} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-medium text-blue-600 hover:text-blue-800 underline shrink-0">
                Join
              </a>
            )}
          </div>
        ) : (
          <div className="py-3 px-4 rounded-xl bg-[var(--warm-50)] border border-[var(--warm-100)]">
            <span className="text-xs text-[var(--warm-400)]">No upcoming bookings</span>
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--warm-500)] uppercase tracking-wider mb-3">Activity</h3>
        <ActivityTimeline
          stageLog={stageLog}
          messages={messages}
          tasks={tasks}
          bookings={bookings}
          payments={payments}
          leadCreatedAt={leadCreatedAt}
          emailMessages={emailMessages}
        />
      </div>
    </div>
  )
}
