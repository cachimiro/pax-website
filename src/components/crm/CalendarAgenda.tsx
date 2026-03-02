'use client'

import { useMemo } from 'react'
import { format, parseISO, isToday, isTomorrow, addDays, isBefore, isAfter, startOfDay } from 'date-fns'
import { Phone, Video, Home, MapPin, Wrench, CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import type { CalendarEvent } from './CalendarTypes'
import { EVENT_LABELS } from './CalendarTypes'

interface CalendarAgendaProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onMarkComplete: (id: string, type: CalendarEvent['eventType']) => void
}

const typeIcons: Record<string, typeof Phone> = {
  call1: Phone,
  call2: Video,
  onboarding: Home,
  visit: MapPin,
  fitting: Wrench,
  task: CheckCircle2,
}

export default function CalendarAgenda({ events, onEventClick, onMarkComplete }: CalendarAgendaProps) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const threeDaysOut = addDays(todayStart, 3)

  const { todayEvents, upcomingEvents } = useMemo(() => {
    const sorted = [...events]
      .filter(e => e.outcome === 'pending' || e.outcome === 'open')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    return {
      todayEvents: sorted.filter(e => isToday(parseISO(e.startTime))),
      upcomingEvents: sorted.filter(e => {
        const d = parseISO(e.startTime)
        return isAfter(d, todayStart) && !isToday(d) && isBefore(d, threeDaysOut)
      }),
    }
  }, [events, todayStart, threeDaysOut])

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Today */}
      <div className="px-4 py-3 border-b border-[var(--warm-100)] bg-[var(--green-50)]/30">
        <h3 className="text-xs font-semibold text-[var(--green-700)] uppercase tracking-wider">
          Today — {format(now, 'd MMM')}
        </h3>
      </div>

      {todayEvents.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-[var(--warm-300)]">No events today</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--warm-50)]">
          {todayEvents.map(event => (
            <AgendaItem
              key={event.id}
              event={event}
              onClick={() => onEventClick(event)}
              onComplete={() => onMarkComplete(event.id, event.eventType)}
            />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcomingEvents.length > 0 && (
        <>
          <div className="px-4 py-2.5 border-t border-[var(--warm-100)] bg-[var(--warm-50)]/30">
            <h3 className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider">
              Next 3 Days
            </h3>
          </div>
          <div className="divide-y divide-[var(--warm-50)]">
            {upcomingEvents.slice(0, 6).map(event => (
              <AgendaItem
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
                showDate
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AgendaItem({
  event,
  onClick,
  onComplete,
  showDate,
}: {
  event: CalendarEvent
  onClick: () => void
  onComplete?: () => void
  showDate?: boolean
}) {
  const Icon = typeIcons[event.eventType] ?? CheckCircle2
  const label = EVENT_LABELS[event.eventType] ?? event.eventType
  const time = format(parseISO(event.startTime), 'HH:mm')
  const isPast = new Date(event.startTime) < new Date()
  const isVideoCall = event.eventType === 'call1' || event.eventType === 'call2'

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--warm-50)]/50 cursor-pointer transition-colors group"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${event.color.bg}`}>
        <Icon size={14} className={event.color.text} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--warm-800)] truncate">{event.title}</span>
          {event.package && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
              event.package === 'select' ? 'bg-amber-100 text-amber-700' :
              event.package === 'standard' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {event.package.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[var(--warm-400)]">{label}</span>
          <span className="text-[10px] text-[var(--warm-300)]">·</span>
          <span className={`text-[10px] font-mono ${isPast ? 'text-red-400' : 'text-[var(--warm-400)]'}`}>
            {time}
          </span>
          {showDate && (
            <>
              <span className="text-[10px] text-[var(--warm-300)]">·</span>
              <span className="text-[10px] text-[var(--warm-400)]">
                {isTomorrow(parseISO(event.startTime)) ? 'Tomorrow' : format(parseISO(event.startTime), 'EEE d')}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {isVideoCall && event.meetLink && (
          <a
            href={event.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            title="Join Meet"
          >
            <Video size={12} className="text-blue-600" />
          </a>
        )}
        {onComplete && (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete() }}
            className="p-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            title="Mark complete"
          >
            <CheckCircle2 size={12} className="text-emerald-600" />
          </button>
        )}
      </div>
    </div>
  )
}
