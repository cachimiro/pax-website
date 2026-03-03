'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface BusyInterval { start: string; end: string }

interface SlotPickerProps {
  onSelect: (dateTime: string) => void
  selected?: string
}

function getAvailableDates() {
  const dates: { date: Date; dayName: string; dayNum: number; monthShort: string; iso: string; label: string }[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (dates.length < 14) {
    if (d.getDay() !== 0) {
      dates.push({
        date: new Date(d),
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-GB', { month: 'short' }),
        iso: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      })
    }
    d.setDate(d.getDate() + 1)
  }
  return dates
}

const TIME_GROUPS = [
  { group: 'Morning', slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
  { group: 'Afternoon', slots: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'] },
  { group: 'Evening', slots: ['16:00', '16:30', '17:00', '17:30', '18:00'] },
]

function isSlotBusy(slotStart: Date, busy: BusyInterval[]): boolean {
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
  return busy.some(b => {
    const bStart = new Date(b.start)
    const bEnd = new Date(b.end)
    return slotStart < bEnd && slotEnd > bStart
  })
}

export default function SlotPicker({ onSelect, selected }: SlotPickerProps) {
  const dates = useMemo(() => getAvailableDates(), [])
  const [offset, setOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [busy, setBusy] = useState<BusyInterval[]>([])
  const [loading, setLoading] = useState(true)

  const visible = dates.slice(offset, offset + 5)

  useEffect(() => {
    const first = dates[0]?.date
    const last = dates[dates.length - 1]?.date
    if (!first || !last) return
    const timeMin = new Date(first); timeMin.setHours(0, 0, 0, 0)
    const timeMax = new Date(last); timeMax.setHours(23, 59, 59, 999)
    fetch(`/api/crm/calendar/freebusy?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`)
      .then(r => r.json())
      .then(d => { setBusy(d.busy ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dates])

  const takenSlots = useMemo(() => {
    const taken = new Set<string>()
    dates.forEach(d => {
      TIME_GROUPS.forEach(g => {
        g.slots.forEach(slot => {
          const [h, m] = slot.split(':').map(Number)
          const dt = new Date(d.date); dt.setHours(h, m, 0, 0)
          if (isSlotBusy(dt, busy)) taken.add(`${d.iso}-${slot}`)
        })
      })
    })
    return taken
  }, [dates, busy])

  function handleTimeClick(time: string) {
    setSelectedTime(time)
    if (selectedDate) {
      onSelect(`${selectedDate}T${time}:00`)
    }
  }

  function handleDateClick(iso: string) {
    setSelectedDate(iso)
    setSelectedTime(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-[var(--green-600)]" size={24} />
        <span className="ml-2 text-sm text-[var(--warm-500)]">Loading available times...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center gap-2">
        <button onClick={() => setOffset(Math.max(0, offset - 5))} disabled={offset === 0}
          className="p-1.5 rounded-lg hover:bg-[var(--warm-50)] disabled:opacity-30 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 grid grid-cols-5 gap-1.5">
          {visible.map(d => (
            <button key={d.iso} onClick={() => handleDateClick(d.iso)}
              className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs transition-all ${
                selectedDate === d.iso
                  ? 'bg-[var(--green-600)] text-white shadow-md'
                  : 'bg-white border border-[var(--warm-100)] hover:border-[var(--green-300)] text-[var(--warm-700)]'
              }`}>
              <span className="font-medium">{d.dayName}</span>
              <span className="text-lg font-bold leading-tight">{d.dayNum}</span>
              <span className="opacity-70">{d.monthShort}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setOffset(Math.min(dates.length - 5, offset + 5))} disabled={offset + 5 >= dates.length}
          className="p-1.5 rounded-lg hover:bg-[var(--warm-50)] disabled:opacity-30 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="space-y-3">
          {TIME_GROUPS.map(group => {
            const available = group.slots.filter(s => !takenSlots.has(`${selectedDate}-${s}`))
            if (available.length === 0) return null
            return (
              <div key={group.group}>
                <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-1.5">{group.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.slots.map(slot => {
                    const taken = takenSlots.has(`${selectedDate}-${slot}`)
                    const isSelected = selectedTime === slot
                    return (
                      <button key={slot} disabled={taken} onClick={() => handleTimeClick(slot)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          taken ? 'bg-gray-50 text-gray-300 cursor-not-allowed line-through' :
                          isSelected ? 'bg-[var(--green-600)] text-white shadow-md' :
                          'bg-white border border-[var(--warm-100)] hover:border-[var(--green-300)] text-[var(--warm-700)]'
                        }`}>
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!selectedDate && (
        <p className="text-center text-sm text-[var(--warm-400)] py-4">Select a date to see available times</p>
      )}
    </div>
  )
}
