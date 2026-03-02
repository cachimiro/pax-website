'use client'

import { useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns'
import type { CalendarEvent } from './CalendarTypes'
import { EVENT_COLORS } from './CalendarTypes'

interface CalendarMonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onDayClick: (day: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

export default function CalendarMonthView({ currentDate, events, onDayClick, onEventClick }: CalendarMonthViewProps) {
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const result: Date[][] = []
    let day = calStart
    while (day <= calEnd) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(day)
        day = addDays(day, 1)
      }
      result.push(week)
    }
    return result
  }, [currentDate])

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      const key = format(parseISO(e.startTime), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [events])

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[var(--warm-100)]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="p-2 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[var(--warm-400)] font-semibold">{d}</span>
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-[var(--warm-50)] last:border-b-0">
          {week.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay[key] ?? []
            const inMonth = isSameMonth(day, currentDate)
            const today = isToday(day)

            return (
              <div
                key={key}
                onClick={() => onDayClick(day)}
                className={`
                  min-h-[90px] p-1.5 border-l border-[var(--warm-50)] first:border-l-0
                  cursor-pointer hover:bg-[var(--warm-50)]/30 transition-colors
                  ${!inMonth ? 'opacity-30' : ''}
                  ${today ? 'bg-[var(--green-50)]/30' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${
                    today ? 'text-white bg-[var(--green-600)] w-6 h-6 rounded-full flex items-center justify-center' :
                    'text-[var(--warm-500)]'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-[var(--warm-400)]">+{dayEvents.length - 3}</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                      className={`
                        flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium truncate
                        ${event.color.bg} ${event.color.text}
                        hover:brightness-95 transition-all cursor-pointer
                        ${event.outcome === 'completed' || event.outcome === 'done' ? 'opacity-50 line-through' : ''}
                      `}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${event.color.dot} shrink-0`} />
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
