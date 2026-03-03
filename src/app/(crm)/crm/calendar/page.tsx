'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useBookings, useProfiles, useRescheduleBooking } from '@/lib/crm/hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, startOfMonth, addDays, addMonths, isSameDay, parseISO, isToday as checkIsToday, setHours, setMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Columns3, LayoutGrid } from 'lucide-react'
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
import type { CalendarEvent } from '@/components/crm/CalendarTypes'
import { EVENT_COLORS, EVENT_LABELS } from '@/components/crm/CalendarTypes'
import CalendarEventCard from '@/components/crm/CalendarEventCard'
import CalendarEventPanel from '@/components/crm/CalendarEventPanel'
import CalendarAgenda from '@/components/crm/CalendarAgenda'
import CalendarStatsBar from '@/components/crm/CalendarStatsBar'
import CalendarMonthView from '@/components/crm/CalendarMonthView'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

type ViewMode = 'week' | 'day' | 'month'

function supabase() { return createClient() }

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [activeBooking, setActiveBooking] = useState<CalendarEvent | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showAgenda, setShowAgenda] = useState(true)

  const { data: bookings = [], isLoading } = useBookings()
  const { data: profiles = [] } = useProfiles()
  const reschedule = useRescheduleBooking()
  const qc = useQueryClient()

  // Fetch visits
  const { data: visits = [] } = useQuery({
    queryKey: ['calendar-visits'],
    queryFn: async () => {
      const { data } = await supabase()
        .from('visits')
        .select('id, opportunity_id, scheduled_at, address, notes, outcome, created_at')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: false })
        .limit(100)
      return data ?? []
    },
  })

  // Fetch fitting slots
  const { data: fittings = [] } = useQuery({
    queryKey: ['calendar-fittings'],
    queryFn: async () => {
      const { data } = await supabase()
        .from('fitting_slots')
        .select('id, opportunity_id, confirmed_date, status, notes, created_at')
        .not('confirmed_date', 'is', null)
        .eq('status', 'confirmed')
        .order('confirmed_date', { ascending: false })
        .limit(100)
      return data ?? []
    },
  })

  // Fetch tasks with due dates
  const { data: tasks = [] } = useQuery({
    queryKey: ['calendar-tasks'],
    queryFn: async () => {
      const { data } = await supabase()
        .from('tasks')
        .select('id, opportunity_id, type, description, status, due_at, owner_user_id')
        .not('due_at', 'is', null)
        .in('status', ['open', 'in_progress'])
        .order('due_at', { ascending: false })
        .limit(100)
      return data ?? []
    },
  })

  // Fetch lead names for all opportunity IDs
  const allOppIds = useMemo(() => {
    const ids = new Set<string>()
    bookings.forEach(b => ids.add(b.opportunity_id))
    visits.forEach(v => ids.add(v.opportunity_id))
    fittings.forEach(f => ids.add(f.opportunity_id))
    tasks.forEach(t => { if (t.opportunity_id) ids.add(t.opportunity_id) })
    return [...ids]
  }, [bookings, visits, fittings, tasks])

  const { data: oppLeadMap = {} } = useQuery({
    queryKey: ['calendar-opp-leads', allOppIds.join(',')],
    queryFn: async () => {
      if (allOppIds.length === 0) return {}
      const { data: opps } = await supabase()
        .from('opportunities')
        .select('id, lead_id, stage, value_estimate, entry_route, package_complexity')
        .in('id', allOppIds)
      if (!opps) return {}
      const leadIds = [...new Set(opps.map(o => o.lead_id))]
      const { data: leads } = await supabase()
        .from('leads')
        .select('id, name')
        .in('id', leadIds)
      const leadMap: Record<string, string> = {}
      leads?.forEach(l => { leadMap[l.id] = l.name })
      const result: Record<string, { name: string; leadId: string; stage: string; value: number | null; package: string | null; route: string | null }> = {}
      opps.forEach(o => {
        result[o.id] = {
          name: leadMap[o.lead_id] ?? 'Unknown',
          leadId: o.lead_id,
          stage: o.stage,
          value: o.value_estimate,
          package: o.package_complexity,
          route: o.entry_route,
        }
      })
      return result
    },
    enabled: allOppIds.length > 0,
  })

  // Merge all events into CalendarEvent[]
  const allEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = []

    // Bookings
    bookings.forEach(b => {
      const info = oppLeadMap[b.opportunity_id]
      events.push({
        id: b.id,
        eventType: b.type as CalendarEvent['eventType'],
        title: info?.name ?? 'Unknown',
        startTime: b.scheduled_at,
        durationMin: b.duration_min,
        outcome: b.outcome,
        meetLink: b.meet_link ?? undefined,
        googleEventId: b.google_event_id ?? undefined,
        notes: b.post_call_notes ?? undefined,
        leadId: info?.leadId,
        opportunityId: b.opportunity_id,
        stage: info?.stage,
        package: info?.package ?? undefined,
        value: info?.value ?? undefined,
        entryRoute: info?.route ?? undefined,
        aiSuggestion: b.ai_suggestion,
        color: EVENT_COLORS[b.type] ?? EVENT_COLORS.call1,
      })
    })

    // Visits
    visits.forEach(v => {
      if (!v.scheduled_at) return
      const info = oppLeadMap[v.opportunity_id]
      events.push({
        id: v.id,
        eventType: 'visit',
        title: info?.name ?? 'Unknown',
        startTime: v.scheduled_at,
        durationMin: 60,
        outcome: v.outcome ?? 'pending',
        address: v.address ?? undefined,
        notes: v.notes ?? undefined,
        leadId: info?.leadId,
        opportunityId: v.opportunity_id,
        stage: info?.stage,
        package: info?.package ?? undefined,
        value: info?.value ?? undefined,
        color: EVENT_COLORS.visit,
      })
    })

    // Fittings
    fittings.forEach(f => {
      if (!f.confirmed_date) return
      const info = oppLeadMap[f.opportunity_id]
      events.push({
        id: f.id,
        eventType: 'fitting',
        title: info?.name ?? 'Unknown',
        startTime: f.confirmed_date,
        durationMin: 240,
        outcome: f.status === 'confirmed' ? 'pending' : f.status,
        notes: f.notes ?? undefined,
        leadId: info?.leadId,
        opportunityId: f.opportunity_id,
        stage: info?.stage,
        package: info?.package ?? undefined,
        value: info?.value ?? undefined,
        color: EVENT_COLORS.fitting,
      })
    })

    // Tasks
    tasks.forEach(t => {
      if (!t.due_at) return
      const info = t.opportunity_id ? oppLeadMap[t.opportunity_id] : undefined
      events.push({
        id: t.id,
        eventType: 'task',
        title: t.description ?? t.type,
        startTime: t.due_at,
        outcome: t.status === 'done' ? 'done' : 'open',
        leadId: info?.leadId,
        opportunityId: t.opportunity_id ?? undefined,
        stage: info?.stage,
        color: EVENT_COLORS.task,
      })
    })

    return events
  }, [bookings, visits, fittings, tasks, oppLeadMap])

  // Filter by user
  const filteredEvents = useMemo(() => {
    if (!selectedUser) return allEvents
    // Only bookings and tasks have owner_user_id
    const ownedBookingIds = new Set(bookings.filter(b => b.owner_user_id === selectedUser).map(b => b.id))
    const ownedTaskIds = new Set(tasks.filter(t => t.owner_user_id === selectedUser).map(t => t.id))
    return allEvents.filter(e =>
      ownedBookingIds.has(e.id) || ownedTaskIds.has(e.id) ||
      e.eventType === 'visit' || e.eventType === 'fitting'
    )
  }, [allEvents, selectedUser, bookings, tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const displayDays = viewMode === 'week' ? weekDays : [selectedDay]

  const getEventsForDayHour = useCallback((day: Date, hour: number): CalendarEvent[] => {
    return filteredEvents.filter((e) => {
      const d = parseISO(e.startTime)
      return isSameDay(d, day) && d.getHours() === hour
    })
  }, [filteredEvents])

  // Current time indicator — updates every minute
  const [nowMinute, setNowMinute] = useState(() => new Date().getMinutes())
  useEffect(() => {
    const interval = setInterval(() => setNowMinute(new Date().getMinutes()), 60000)
    return () => clearInterval(interval)
  }, [])
  const currentHour = new Date().getHours()

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    const ev = filteredEvents.find(e => e.id === event.active.id)
    setActiveBooking(ev ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveBooking(null)
    const { active, over } = event
    if (!over) return

    const eventId = active.id as string
    const calEvent = filteredEvents.find(e => e.id === eventId)
    if (!calEvent || calEvent.eventType === 'task') return // Only reschedule bookings

    const overId = over.id as string
    if (!overId.startsWith('slot-')) return

    const parts = overId.split('-')
    const dayStr = parts.slice(1, 4).join('-')
    const hour = parseInt(parts[4], 10)

    const oldDate = parseISO(calEvent.startTime)
    const newDate = setMinutes(setHours(parseISO(dayStr), hour), oldDate.getMinutes())

    if (oldDate.getTime() === newDate.getTime()) return

    // Only bookings can be rescheduled via drag
    if (['call1', 'call2', 'onboarding'].includes(calEvent.eventType)) {
      reschedule.mutate(
        { id: eventId, scheduled_at: newDate.toISOString() },
        {
          onSuccess: () => toast.success(`Rescheduled to ${format(newDate, 'EEE d MMM, HH:mm')}`),
          onError: () => toast.error('Failed to reschedule'),
        }
      )
    }
  }

  // Refresh all calendar data after an action
  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['bookings'] })
    qc.invalidateQueries({ queryKey: ['calendar-visits'] })
    qc.invalidateQueries({ queryKey: ['calendar-fittings'] })
    qc.invalidateQueries({ queryKey: ['calendar-tasks'] })
    qc.invalidateQueries({ queryKey: ['calendar-opp-leads'] })
  }, [qc])

  function goToday() {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    setMonthDate(startOfMonth(new Date()))
    setSelectedDay(new Date())
  }

  function goPrev() {
    if (viewMode === 'week') setWeekStart((d) => addDays(d, -7))
    else if (viewMode === 'day') setSelectedDay((d) => addDays(d, -1))
    else setMonthDate((d) => addMonths(d, -1))
  }

  function goNext() {
    if (viewMode === 'week') setWeekStart((d) => addDays(d, 7))
    else if (viewMode === 'day') setSelectedDay((d) => addDays(d, 1))
    else setMonthDate((d) => addMonths(d, 1))
  }

  const dateLabel = viewMode === 'week'
    ? `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM yyyy')}`
    : viewMode === 'month'
    ? format(monthDate, 'MMMM yyyy')
    : format(selectedDay, 'EEEE, d MMMM yyyy')

  const gridCols = viewMode === 'week'
    ? 'grid-cols-[60px_repeat(7,1fr)]'
    : 'grid-cols-[60px_1fr]'

  const weekEventCount = filteredEvents.filter(e => {
    const d = parseISO(e.startTime)
    return weekDays.some(wd => isSameDay(d, wd))
  }).length

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-4">
        <CalendarStatsBar events={allEvents} />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">Calendar</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">{weekEventCount} events this week</p>
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
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'text-[var(--green-700)] bg-[var(--green-50)]' : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
              }`}
            >
              <LayoutGrid size={13} /> Month
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-[var(--warm-100)] rounded-xl overflow-hidden shadow-sm">
            <button onClick={goPrev} className="p-2.5 hover:bg-[var(--warm-50)] transition-colors">
              <ChevronLeft size={14} className="text-[var(--warm-500)]" />
            </button>
            <span className="text-xs font-medium text-[var(--warm-700)] min-w-[150px] text-center px-1">
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

      {/* Main layout: calendar + agenda sidebar */}
      <div className="flex gap-5">
        {/* Calendar area */}
        <div className="flex-1 min-w-0">
          {viewMode === 'month' ? (
            <CalendarMonthView
              currentDate={monthDate}
              events={filteredEvents}
              onDayClick={(day) => { setSelectedDay(day); setViewMode('day') }}
              onEventClick={(e) => setSelectedEvent(e)}
            />
          ) : (
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
                          const dayEventCount = filteredEvents.filter(e => isSameDay(parseISO(e.startTime), day)).length
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
                              {dayEventCount > 0 && (
                                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[var(--green-500)]" />}
                                  <span className="text-[9px] text-[var(--warm-300)]">{dayEventCount}</span>
                                </div>
                              )}
                              {isToday && dayEventCount === 0 && <div className="w-1.5 h-1.5 rounded-full bg-[var(--green-500)] mx-auto mt-0.5" />}
                            </div>
                          )
                        })}
                      </div>

                      {/* Time rows */}
                      {isLoading ? (
                        <div className="p-8 text-center text-sm text-[var(--warm-300)]">Loading...</div>
                      ) : (
                        HOURS.map((hour) => (
                          <div key={hour} className={`grid ${gridCols} border-b border-[var(--warm-50)] min-h-[64px] relative`}>
                            <div className="p-2 text-right pr-3">
                              <span className="text-[10px] text-[var(--warm-300)] font-mono">
                                {String(hour).padStart(2, '0')}:00
                              </span>
                            </div>
                            {displayDays.map((day) => {
                              const dayEvents = getEventsForDayHour(day, hour)
                              const isNowRow = checkIsToday(day) && currentHour === hour
                              const slotId = `slot-${format(day, 'yyyy-MM-dd')}-${hour}`
                              return (
                                <DroppableSlot key={slotId} id={slotId} isNowRow={isNowRow} nowMinute={nowMinute}>
                                  {dayEvents.map((e) => (
                                    <DraggableEvent key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
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
                {activeBooking ? <CalendarEventCard event={activeBooking} isOverlay /> : null}
              </DragOverlay>
            </DndContext>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {Object.entries(EVENT_COLORS).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded ${colors.dot}`} />
                <span className="text-xs text-[var(--warm-400)]">{EVENT_LABELS[type] ?? type}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-4 h-[2px] bg-red-400 rounded" />
              <span className="text-xs text-[var(--warm-400)]">Now</span>
            </div>
            <span className="text-[10px] text-[var(--warm-300)] ml-auto">Drag bookings to reschedule · Click events for details</span>
          </div>
        </div>

        {/* Agenda sidebar */}
        <div className="hidden xl:block w-72 shrink-0">
          <CalendarAgenda
            events={allEvents}
            onEventClick={(e) => setSelectedEvent(e)}
          />
        </div>
      </div>

      {/* Event detail panel */}
      <CalendarEventPanel
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onActionComplete={refreshAll}
      />
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
        border-l border-[var(--warm-50)] p-1 min-h-[64px] min-w-0 relative transition-colors duration-200 overflow-hidden
        ${isNowRow ? 'bg-[var(--green-50)]/30' : ''}
        ${isOver ? 'bg-[var(--green-50)] ring-1 ring-inset ring-[var(--green-300)]/40' : ''}
      `}
    >
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

      {isOver && (
        <div className="absolute inset-1 border-2 border-dashed border-[var(--green-400)]/40 rounded-lg pointer-events-none z-[5] flex items-center justify-center">
          <span className="text-[9px] text-[var(--green-500)] font-medium bg-white/80 px-1.5 py-0.5 rounded">Drop here</span>
        </div>
      )}

      {children}
    </div>
  )
}

// ─── Draggable event ─────────────────────────────────────────────────────────

function DraggableEvent({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <CalendarEventCard event={event} onClick={onClick} />
    </div>
  )
}
