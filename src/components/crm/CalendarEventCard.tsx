'use client'

import { format, parseISO } from 'date-fns'
import { Phone, Video, Home, MapPin, Wrench, CheckCircle2 } from 'lucide-react'
import type { CalendarEvent } from './CalendarTypes'

const typeIcons: Record<string, typeof Phone> = {
  call1: Phone, call2: Video, onboarding: Home,
  visit: MapPin, fitting: Wrench, task: CheckCircle2,
}

interface Props {
  event: CalendarEvent
  isOverlay?: boolean
  compact?: boolean
  onClick?: () => void
}

export default function CalendarEventCard({ event, isOverlay, compact, onClick }: Props) {
  const Icon = typeIcons[event.eventType] ?? CheckCircle2
  const label = EVENT_LABELS[event.eventType] ?? event.eventType
  const isDone = event.outcome === 'completed' || event.outcome === 'done'
  const isNoShow = event.outcome === 'no_show'
  const isCancelled = event.outcome === 'cancelled'
  const isVideoCall = event.eventType === 'call1' || event.eventType === 'call2'

  return (
    <div
      onClick={onClick}
      className={`
        ${event.color.bg} border-l-[3px] ${event.color.border} ${event.color.text}
        rounded-lg px-2 py-1.5 text-[10px] font-medium mb-1 w-full max-w-full overflow-hidden
        transition-all group relative select-none cursor-pointer
        ${isDone ? 'opacity-50' : isNoShow || isCancelled ? 'opacity-35' : ''}
        ${isOverlay ? 'shadow-xl ring-1 ring-[var(--green-500)]/20 rotate-[1deg] scale-105' : 'hover:shadow-md hover:brightness-[0.97]'}
      `}
    >
      <div className="flex items-center gap-1">
        <Icon size={10} className="shrink-0 opacity-70" />
        <span className="truncate font-semibold">{event.title}</span>
        {event.package && (
          <span className={`text-[8px] px-1 py-px rounded-full shrink-0 font-bold ${
            event.package === 'select' ? 'bg-amber-200/60 text-amber-800' :
            event.package === 'standard' ? 'bg-blue-200/60 text-blue-800' :
            'bg-gray-200/60 text-gray-700'
          }`}>
            {event.package.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="opacity-60">{format(parseISO(event.startTime), 'HH:mm')}</span>
          {event.durationMin && <span className="opacity-40">· {event.durationMin}m</span>}
          {isVideoCall && event.meetLink && (
            <Video size={8} className="opacity-40" />
          )}
          {isDone && <span className="opacity-60">✓</span>}
          {isNoShow && <span className="opacity-60">✗</span>}
        </div>
      )}


    </div>
  )
}
