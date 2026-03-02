'use client'

import { useMemo } from 'react'
import { isToday, parseISO } from 'date-fns'
import { Phone, Video, Home, MapPin, Wrench, PoundSterling } from 'lucide-react'
import type { CalendarEvent } from './CalendarTypes'

interface CalendarStatsBarProps {
  events: CalendarEvent[]
}

export default function CalendarStatsBar({ events }: CalendarStatsBarProps) {
  const stats = useMemo(() => {
    const todayEvents = events.filter(e =>
      isToday(parseISO(e.startTime)) && (e.outcome === 'pending' || e.outcome === 'open')
    )

    const calls = todayEvents.filter(e => e.eventType === 'call1' || e.eventType === 'call2').length
    const visits = todayEvents.filter(e => e.eventType === 'visit').length
    const fittings = todayEvents.filter(e => e.eventType === 'fitting').length
    const onboardings = todayEvents.filter(e => e.eventType === 'onboarding').length
    const totalValue = todayEvents.reduce((sum, e) => sum + (e.value ?? 0), 0)

    return { calls, visits, fittings, onboardings, totalValue, total: todayEvents.length }
  }, [events])

  if (stats.total === 0) return null

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-white rounded-xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex-wrap">
      {stats.calls > 0 && (
        <Stat icon={Phone} color="text-blue-500" bg="bg-blue-50" label={`${stats.calls} call${stats.calls > 1 ? 's' : ''}`} />
      )}
      {stats.visits > 0 && (
        <Stat icon={MapPin} color="text-emerald-500" bg="bg-emerald-50" label={`${stats.visits} visit${stats.visits > 1 ? 's' : ''}`} />
      )}
      {stats.fittings > 0 && (
        <Stat icon={Wrench} color="text-rose-500" bg="bg-rose-50" label={`${stats.fittings} fitting${stats.fittings > 1 ? 's' : ''}`} />
      )}
      {stats.onboardings > 0 && (
        <Stat icon={Home} color="text-amber-500" bg="bg-amber-50" label={`${stats.onboardings} onboarding${stats.onboardings > 1 ? 's' : ''}`} />
      )}
      {stats.totalValue > 0 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <PoundSterling size={12} className="text-[var(--warm-400)]" />
          <span className="text-xs font-semibold text-[var(--warm-700)]">
            £{stats.totalValue.toLocaleString('en-GB')}
          </span>
          <span className="text-[10px] text-[var(--warm-400)]">in play today</span>
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, color, bg, label }: { icon: typeof Phone; color: string; bg: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-5 h-5 rounded flex items-center justify-center ${bg}`}>
        <Icon size={11} className={color} />
      </div>
      <span className="text-xs font-medium text-[var(--warm-600)]">{label}</span>
    </div>
  )
}
