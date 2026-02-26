'use client'

import { useState, useMemo } from 'react'
import { useBookings, useProfiles } from '@/lib/crm/hooks'
import { format, startOfWeek, addDays, isSameDay, parseISO, isToday as checkIsToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Booking } from '@/lib/crm/types'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

const typeColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  call1:      { bg: 'bg-blue-50',    border: 'border-l-blue-400',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  call2:      { bg: 'bg-emerald-50', border: 'border-l-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  onboarding: { bg: 'bg-purple-50',  border: 'border-l-purple-400',  text: 'text-purple-700',  dot: 'bg-purple-400' },
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedUser, setSelectedUser] = useState<string>('')

  const { data: bookings = [], isLoading } = useBookings()
  const { data: profiles = [] } = useProfiles()

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const filtered = useMemo(() => {
    if (!selectedUser) return bookings
    return bookings.filter((b) => b.owner_user_id === selectedUser)
  }, [bookings, selectedUser])

  function getBookingsForDayHour(day: Date, hour: number): Booking[] {
    return filtered.filter((b) => {
      const d = parseISO(b.scheduled_at)
      return isSameDay(d, day) && d.getHours() === hour
    })
  }

  const currentHour = new Date().getHours()

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">Calendar</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">{filtered.length} bookings this week</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2.5 text-sm bg-white border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none text-[var(--warm-700)]"
          >
            <option value="">All users</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="p-2.5 hover:bg-[var(--warm-50)] transition-colors"
            >
              <ChevronLeft size={14} className="text-[var(--warm-500)]" />
            </button>
            <span className="text-xs font-medium text-[var(--warm-700)] min-w-[130px] text-center px-1">
              {format(weekDays[0], 'd MMM')} – {format(weekDays[6], 'd MMM yyyy')}
            </span>
            <button
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              className="p-2.5 hover:bg-[var(--warm-50)] transition-colors"
            >
              <ChevronRight size={14} className="text-[var(--warm-500)]" />
            </button>
          </div>

          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-2.5 text-xs font-medium text-[var(--green-600)] bg-[var(--green-50)] hover:bg-[var(--green-100)] rounded-xl transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--warm-100)]">
              <div className="p-2" />
              {weekDays.map((day) => {
                const isToday = checkIsToday(day)
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-3 text-center border-l border-[var(--warm-50)] ${isToday ? 'bg-[var(--green-50)]' : ''}`}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-[var(--warm-400)] font-semibold">
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-lg font-semibold ${isToday ? 'text-[var(--green-700)]' : 'text-[var(--warm-700)]'}`}>
                      {format(day, 'd')}
                    </p>
                    {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[var(--green-500)] mx-auto mt-0.5" />}
                  </div>
                )
              })}
            </div>

            {/* Time rows */}
            {isLoading ? (
              <div className="p-8 text-center text-sm text-[var(--warm-300)]">Loading bookings...</div>
            ) : (
              HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--warm-50)] min-h-[64px] relative">
                  <div className="p-2 text-right pr-3">
                    <span className="text-[10px] text-[var(--warm-300)] font-mono">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                  {weekDays.map((day) => {
                    const dayBookings = getBookingsForDayHour(day, hour)
                    const isNowRow = checkIsToday(day) && currentHour === hour
                    return (
                      <div
                        key={day.toISOString()}
                        className={`border-l border-[var(--warm-50)] p-1 min-h-[64px] relative ${isNowRow ? 'bg-[var(--green-50)]/30' : ''}`}
                      >
                        {/* Current time indicator */}
                        {isNowRow && (
                          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-red-400 z-10">
                            <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-red-400" />
                          </div>
                        )}
                        {dayBookings.map((b) => {
                          const colors = typeColors[b.type] ?? typeColors.call1
                          const isDone = b.outcome === 'completed'
                          const isNoShow = b.outcome === 'no_show'
                          return (
                            <div
                              key={b.id}
                              className={`
                                ${colors.bg} border-l-[3px] ${colors.border} ${colors.text}
                                rounded-lg px-2 py-1.5 text-[10px] font-medium mb-1
                                transition-all hover:shadow-sm cursor-default group relative
                                ${isDone ? 'opacity-60' : isNoShow ? 'opacity-40' : ''}
                              `}
                            >
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
                                <span className="capitalize truncate">{b.type}</span>
                              </div>
                              <span className="text-[9px] opacity-60 block">
                                {format(parseISO(b.scheduled_at), 'HH:mm')}
                              </span>

                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                                <div className="bg-[var(--warm-900)] text-white text-[9px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                  <span className="capitalize">{b.type}</span> at {format(parseISO(b.scheduled_at), 'HH:mm')}
                                  {b.outcome !== 'pending' && <span className="ml-1 opacity-60">({b.outcome})</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4">
        {Object.entries(typeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded ${colors.dot}`} />
            <span className="text-xs text-[var(--warm-400)] capitalize">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-4 h-[2px] bg-red-400 rounded" />
          <span className="text-xs text-[var(--warm-400)]">Now</span>
        </div>
      </div>
    </div>
  )
}
