'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useBookings, useProfiles, useRescheduleBooking } from '@/lib/crm/hooks'
import { format, startOfWeek, addDays, isSameDay, parseISO, isToday as checkIsToday, setHours, setMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Columns3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { toast } from 'sonner'
import type { Booking } from '@/lib/crm/types'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

type ViewMode = 'week' | 'day'

const typeColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  call1:      { bg: 'bg-blue-50',    border: 'border-l-blue-400',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  call2:      { bg: 'bg-emerald-50', border: 'border-l-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  onboarding: { bg: 'bg-purple-50',  border: 'border-l-purple-400',  text: 'text-purple-700',  dot: 'bg-purple-400' },
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)

  const { data: bookings = [], isLoading } = useBookings()
  const { data: profiles = [] } = useProfiles()
  const reschedule = useRescheduleBooking()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const displayDays = viewMode === 'week' ? weekDays : [selectedDay]

  const filtered = useMemo(() => {
    if (!selectedUser) return bookings
    return bookings.filter((b) => b.owner_user_id === selectedUser)
  }, [bookings, selectedUser])

  const getBookingsForDayHour = useCallback((day: Date, hour: number): Booking[] => {
    return filtered.filter((b) => {
      const d = parseISO(b.scheduled_at)
      return isSameDay(d, day) && d.getHours() === hour
    })
  }, [filtered])

  // Current time indicator — updates every minute
  const [nowMinute, setNowMinute] = useState(() => new Date().getMinutes())
  useEffect(() => {
    const interval = setInterval(() => setNowMinute(new Date().getMinutes()), 60000)
    return () => clearInterval(interval)
  }, [])
  const currentHour = new Date().getHours()

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    const booking = filtered.find(b => b.id === event.active.id)
    setActiveBooking(booking ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveBooking(null)
    const { active, over } = event
    if (!over) return

    const bookingId = active.id as string
    const booking = filtered.find(b => b.id === bookingId)
    if (!booking) return

    const overId = over.id as string
    if (!overId.startsWith('slot-')) return

    const parts = overId.split('-')
    const dayStr = parts.slice(1, 4).join('-')
    const hour = parseInt(parts[4], 10)

    const oldDate = parseISO(booking.scheduled_at)
    const newDate = setMinutes(setHours(parseISO(dayStr), hour), oldDate.getMinutes())

    if (oldDate.getTime() === newDate.getTime()) return

    reschedule.mutate(
      { id: bookingId, scheduled_at: newDate.toISOString() },
      {
        onSuccess: () => {
          toast.success(`Rescheduled to ${format(newDate, 'EEE d MMM, HH:mm')}`)
        },
        onError: () => {
          toast.error('Failed to reschedule booking')
        },
      }
    )
  }

  function goToday() {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    setSelectedDay(new Date())
  }

  function goPrev() {
    if (viewMode === 'week') {
      setWeekStart((d) => addDays(d, -7))
    } else {
      setSelectedDay((d) => addDays(d, -1))
    }
  }

  function goNext() {
    if (viewMode === 'week') {
      setWeekStart((d) => addDays(d, 7))
    } else {
      setSelectedDay((d) => addDays(d, 1))
    }
  }

  const dateLabel = viewMode === 'week'
    ? `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM yyyy')}`
    : format(selectedDay, 'EEEE, d MMMM yyyy')

  const gridCols = viewMode === 'week'
    ? 'grid-cols-[60px_repeat(7,1fr)]'
    : 'grid-cols-[60px_1fr]'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">Calendar</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">{filtered.length} bookings this week</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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

          {/* View toggle */}
          <div className="relative flex items-center bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                viewMode === 'day' ? 'text-[var(--green-700)] bg-[var(--green-50)]' : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
              }`}
            >
              <CalendarIcon size={13} /> Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'text-[var(--green-700)] bg-[var(--green-50)]' : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
              }`}
            >
              <Columns3 size={13} /> Week
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden shadow-sm">
            <button onClick={goPrev} className="p-2.5 hover:bg-[var(--warm-50)] transition-colors">
              <ChevronLeft size={14} className="text-[var(--warm-500)]" />
            </button>
            <span className="text-xs font-medium text-[var(--warm-700)] min-w-[130px] text-center px-1">
              {dateLabel}
            </span>
            <button onClick={goNext} className="p-2.5 hover:bg-[var(--warm-50)] transition-colors">
              <ChevronRight size={14} className="text-[var(--warm-500)]" />
            </button>
          </div>

          <button
            onClick={goToday}
            className="px-3 py-2.5 text-xs font-medium text-[var(--green-600)] bg-[var(--green-50)] hover:bg-[var(--green-100)] rounded-xl transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden card-hover-border">
          <div className="overflow-x-auto scrollbar-fade">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${viewMode}-${displayDays[0]?.toISOString()}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className={viewMode === 'week' ? 'min-w-[800px]' : ''}
              >
                {/* Day headers */}
                <div className={`grid ${gridCols} border-b border-[var(--warm-100)]`}>
                  <div className="p-2" />
                  {displayDays.map((day) => {
                    const isToday = checkIsToday(day)
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-3 text-center border-l border-[var(--warm-50)] cursor-pointer hover:bg-[var(--warm-50)]/50 transition-colors ${isToday ? 'bg-[var(--green-50)]' : ''}`}
                        onClick={() => {
                          setSelectedDay(day)
                          if (viewMode === 'week') setViewMode('day')
                        }}
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
                    <div key={hour} className={`grid ${gridCols} border-b border-[var(--warm-50)] min-h-[64px] relative`}>
                      <div className="p-2 text-right pr-3">
                        <span className="text-[10px] text-[var(--warm-300)] font-mono">
                          {String(hour).padStart(2, '0')}:00
                        </span>
                      </div>
                      {displayDays.map((day) => {
                        const dayBookings = getBookingsForDayHour(day, hour)
                        const isNowRow = checkIsToday(day) && currentHour === hour
                        const slotId = `slot-${format(day, 'yyyy-MM-dd')}-${hour}`
                        return (
                          <DroppableSlot key={slotId} id={slotId} isNowRow={isNowRow} nowMinute={nowMinute}>
                            {dayBookings.map((b) => (
                              <DraggableBooking key={b.id} booking={b} />
                            ))}
                          </DroppableSlot>
                        )
                      })}
                    </div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <DragOverlay>
          {activeBooking ? <BookingCard booking={activeBooking} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 flex-wrap">
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
        <span className="text-[10px] text-[var(--warm-300)] ml-auto">Drag bookings to reschedule</span>
      </div>
    </div>
  )
}

// ─── Droppable time slot ─────────────────────────────────────────────────────

function DroppableSlot({
  id,
  isNowRow,
  nowMinute,
  children,
}: {
  id: string
  isNowRow: boolean
  nowMinute: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`
        border-l border-[var(--warm-50)] p-1 min-h-[64px] relative transition-colors duration-200
        ${isNowRow ? 'bg-[var(--green-50)]/30' : ''}
        ${isOver ? 'bg-[var(--green-50)] ring-1 ring-inset ring-[var(--green-300)]/40' : ''}
      `}
    >
      {/* Current time indicator — positioned by minute within the hour */}
      {isNowRow && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-red-400 z-10 pointer-events-none"
          style={{ top: `${(nowMinute / 60) * 100}%` }}
          layout
          transition={{ duration: 0.5 }}
        >
          <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-red-400" />
        </motion.div>
      )}

      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-1 border-2 border-dashed border-[var(--green-400)]/40 rounded-lg pointer-events-none z-[5] flex items-center justify-center">
          <span className="text-[9px] text-[var(--green-500)] font-medium bg-white/80 px-1.5 py-0.5 rounded">Drop here</span>
        </div>
      )}

      {children}
    </div>
  )
}

// ─── Draggable booking ───────────────────────────────────────────────────────

function DraggableBooking({ booking }: { booking: Booking }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <BookingCard booking={booking} />
    </div>
  )
}

// ─── Booking card ────────────────────────────────────────────────────────────

function BookingCard({ booking, isOverlay }: { booking: Booking; isOverlay?: boolean }) {
  const colors = typeColors[booking.type] ?? typeColors.call1
  const isDone = booking.outcome === 'completed'
  const isNoShow = booking.outcome === 'no_show'

  return (
    <div
      className={`
        ${colors.bg} border-l-[3px] ${colors.border} ${colors.text}
        rounded-lg px-2 py-1.5 text-[10px] font-medium mb-1
        transition-all group relative select-none
        ${isDone ? 'opacity-60' : isNoShow ? 'opacity-40' : ''}
        ${isOverlay ? 'shadow-xl ring-1 ring-[var(--green-500)]/20 rotate-[1deg] scale-105' : 'hover:shadow-sm'}
      `}
    >
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
        <span className="capitalize truncate">{booking.type}</span>
      </div>
      <span className="text-[9px] opacity-60 block">
        {format(parseISO(booking.scheduled_at), 'HH:mm')}
      </span>

      {/* Tooltip */}
      {!isOverlay && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
          <div className="bg-[var(--warm-900)] text-white text-[9px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            <span className="capitalize">{booking.type}</span> at {format(parseISO(booking.scheduled_at), 'HH:mm')}
            {booking.outcome !== 'pending' && <span className="ml-1 opacity-60">({booking.outcome})</span>}
          </div>
        </div>
      )}
    </div>
  )
}
