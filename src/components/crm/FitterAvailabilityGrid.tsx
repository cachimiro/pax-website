'use client'

import { useState, useEffect } from 'react'
import { Loader2, Star, TrendingDown, MapPin, Clock } from 'lucide-react'

interface FitterAvailability {
  id: string
  name: string
  status: 'available' | 'busy' | 'blocked' | 'off' | 'unavailable'
  current_jobs: number
  max_jobs: number
  start_time: string
  end_time: string
  travel_radius_miles: number | null
  avg_rating: number | null
  total_jobs_completed: number | null
  decline_rate: number | null
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  available:   { label: 'Available',   className: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  busy:        { label: 'Fully Booked', className: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  off:         { label: 'Day Off',     className: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
  blocked:     { label: 'Blocked',     className: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
  unavailable: { label: 'Unavailable', className: 'bg-gray-50 border-gray-200', dot: 'bg-gray-300' },
}

interface Props {
  date: string | null
  onSelectFitter?: (fitterId: string) => void
  selectedFitterId?: string
}

export default function FitterAvailabilityGrid({ date, onSelectFitter, selectedFitterId }: Props) {
  const [fitters, setFitters] = useState<FitterAvailability[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!date) {
      setFitters([])
      return
    }

    const dateOnly = date.slice(0, 10)
    setLoading(true)
    fetch(`/api/crm/fitters/availability?date=${dateOnly}`)
      .then(r => r.json())
      .then(data => setFitters(data.fitters || []))
      .catch(() => setFitters([]))
      .finally(() => setLoading(false))
  }, [date])

  if (!date) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-[var(--warm-500)]">
        <Loader2 size={12} className="animate-spin" /> Checking fitter availability...
      </div>
    )
  }

  if (fitters.length === 0) {
    return (
      <p className="text-xs text-[var(--warm-400)] py-2">No fitters found</p>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--warm-600)]">
        Fitter Availability for {new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
      </label>
      <div className="grid gap-1.5">
        {fitters.map(f => {
          const config = STATUS_CONFIG[f.status] || STATUS_CONFIG.unavailable
          const isSelected = selectedFitterId === f.id
          const isClickable = f.status === 'available' && onSelectFitter

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => isClickable && onSelectFitter?.(f.id)}
              disabled={f.status !== 'available'}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${config.className} ${
                isSelected ? 'ring-2 ring-[var(--brand)] ring-offset-1' : ''
              } ${isClickable ? 'cursor-pointer hover:shadow-sm' : 'cursor-default opacity-70'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className="text-sm font-medium text-[var(--warm-800)]">{f.name}</span>
                  <span className="text-[10px] text-[var(--warm-500)]">{config.label}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--warm-500)]">
                  {f.status === 'available' && (
                    <>
                      <span className="flex items-center gap-0.5">
                        <Clock size={9} />{f.start_time}-{f.end_time}
                      </span>
                      <span>{f.current_jobs}/{f.max_jobs} jobs</span>
                    </>
                  )}
                  {f.avg_rating && f.avg_rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star size={9} className="text-yellow-500" />{f.avg_rating.toFixed(1)}
                    </span>
                  )}
                  {f.decline_rate != null && f.decline_rate > 20 && (
                    <span className="flex items-center gap-0.5 text-orange-500">
                      <TrendingDown size={9} />{f.decline_rate}% decline
                    </span>
                  )}
                  {f.travel_radius_miles && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={9} />{f.travel_radius_miles}mi
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
