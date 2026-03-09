'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, AlertCircle, CalendarDays, Save, Plus, Trash2, ToggleLeft, ToggleRight
} from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface DaySchedule {
  day_of_week: number
  is_available: boolean
  start_time: string
  end_time: string
  max_jobs_per_day: number
}

interface BlockedDate {
  id: string
  blocked_date: string
  reason: string | null
}

interface Settings {
  travel_radius_miles: number | null
  service_areas: string[] | null
  available_for_jobs: boolean
}

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [settings, setSettings] = useState<Settings>({
    travel_radius_miles: null,
    service_areas: null,
    available_for_jobs: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newBlockDate, setNewBlockDate] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const [addingBlock, setAddingBlock] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch('/api/fitter/availability')
      if (!res.ok) throw new Error('Failed to load availability')
      const data = await res.json()

      // Ensure all 7 days exist
      const existing = data.schedule || []
      const full: DaySchedule[] = DAYS.map((_, i) => {
        const found = existing.find((d: DaySchedule) => d.day_of_week === i)
        return found || {
          day_of_week: i,
          is_available: i < 5, // Mon-Fri default
          start_time: '08:00',
          end_time: '17:00',
          max_jobs_per_day: 2,
        }
      })
      setSchedule(full)
      setBlockedDates(data.blocked_dates || [])
      if (data.settings) setSettings(data.settings)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function updateDay(dayIndex: number, updates: Partial<DaySchedule>) {
    setSchedule(prev => prev.map(d =>
      d.day_of_week === dayIndex ? { ...d, ...updates } : d
    ))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/fitter/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, settings }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSuccess('Schedule saved')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function addBlockedDate() {
    if (!newBlockDate) return
    setAddingBlock(true)
    try {
      const res = await fetch('/api/fitter/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_date: newBlockDate, reason: newBlockReason || null }),
      })
      if (!res.ok) throw new Error('Failed to add')
      const data = await res.json()
      setBlockedDates(prev => [...prev, data.blocked_date].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)))
      setNewBlockDate('')
      setNewBlockReason('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add blocked date')
    } finally {
      setAddingBlock(false)
    }
  }

  async function removeBlockedDate(id: string) {
    try {
      const res = await fetch('/api/fitter/availability', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Failed to remove')
      setBlockedDates(prev => prev.filter(d => d.id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--warm-900)] flex items-center gap-2">
            <CalendarDays size={20} className="text-[var(--green-600)]" /> My Schedule
          </h1>
          <p className="text-xs text-[var(--warm-500)] mt-0.5">
            Set your working hours and block off dates
          </p>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, available_for_jobs: !s.available_for_jobs }))}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            settings.available_for_jobs
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {settings.available_for_jobs ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {settings.available_for_jobs ? 'Available' : 'Unavailable'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--warm-50)]">
          <h2 className="text-sm font-semibold text-[var(--warm-800)]">Weekly Hours</h2>
        </div>
        <div className="divide-y divide-[var(--warm-50)]">
          {schedule.map(day => (
            <div key={day.day_of_week} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => updateDay(day.day_of_week, { is_available: !day.is_available })}
                  className="flex items-center gap-2 min-w-[100px]"
                >
                  <div className={`w-8 h-5 rounded-full transition-colors relative ${
                    day.is_available ? 'bg-[var(--green-600)]' : 'bg-[var(--warm-200)]'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      day.is_available ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className={`text-sm font-medium ${
                    day.is_available ? 'text-[var(--warm-900)]' : 'text-[var(--warm-400)]'
                  }`}>
                    {DAYS[day.day_of_week]}
                  </span>
                </button>

                {day.is_available && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={day.start_time}
                      onChange={e => updateDay(day.day_of_week, { start_time: e.target.value })}
                      className="px-2 py-1 text-xs border border-[var(--warm-100)] rounded-lg w-[90px]"
                    />
                    <span className="text-xs text-[var(--warm-400)]">to</span>
                    <input
                      type="time"
                      value={day.end_time}
                      onChange={e => updateDay(day.day_of_week, { end_time: e.target.value })}
                      className="px-2 py-1 text-xs border border-[var(--warm-100)] rounded-lg w-[90px]"
                    />
                    <select
                      value={day.max_jobs_per_day}
                      onChange={e => updateDay(day.day_of_week, { max_jobs_per_day: parseInt(e.target.value) })}
                      className="px-2 py-1 text-xs border border-[var(--warm-100)] rounded-lg"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} job{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-[var(--green-600)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--green-700)] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save Schedule
      </button>

      {/* Blocked Dates */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--warm-50)]">
          <h2 className="text-sm font-semibold text-[var(--warm-800)]">Blocked Dates</h2>
          <p className="text-[11px] text-[var(--warm-500)]">Holidays, personal days, etc.</p>
        </div>

        {/* Add new */}
        <div className="px-4 py-3 border-b border-[var(--warm-50)] bg-[var(--warm-50)]">
          <div className="flex gap-2">
            <input
              type="date"
              value={newBlockDate}
              onChange={e => setNewBlockDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="flex-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg bg-white"
            />
            <input
              type="text"
              value={newBlockReason}
              onChange={e => setNewBlockReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg bg-white"
            />
            <button
              onClick={addBlockedDate}
              disabled={!newBlockDate || addingBlock}
              className="px-3 py-2 bg-[var(--green-600)] text-white rounded-lg hover:bg-[var(--green-700)] disabled:opacity-50"
            >
              {addingBlock ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
        </div>

        {/* List */}
        {blockedDates.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-[var(--warm-400)]">
            No blocked dates
          </div>
        ) : (
          <div className="divide-y divide-[var(--warm-50)]">
            {blockedDates.map(bd => (
              <div key={bd.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm text-[var(--warm-800)]">
                    {new Date(bd.blocked_date + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </span>
                  {bd.reason && (
                    <span className="text-xs text-[var(--warm-500)] ml-2">{bd.reason}</span>
                  )}
                </div>
                <button
                  onClick={() => removeBlockedDate(bd.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Travel radius */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--warm-800)]">Travel Preferences</h2>
        <div>
          <label className="text-xs font-medium text-[var(--warm-600)]">Max Travel Radius (miles)</label>
          <input
            type="number"
            value={settings.travel_radius_miles || ''}
            onChange={e => setSettings(s => ({ ...s, travel_radius_miles: e.target.value ? parseInt(e.target.value) : null }))}
            placeholder="e.g. 30"
            className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg"
          />
        </div>
      </div>

      {/* Google Calendar */}
      <GoogleCalendarSection />
    </div>
  )
}

function GoogleCalendarSection() {
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')

  useEffect(() => {
    // Check URL params for callback result
    const params = new URLSearchParams(window.location.search)
    const calParam = params.get('calendar')
    if (calParam === 'connected') {
      setStatus('connected')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (calParam === 'error') {
      setStatus('disconnected')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function connectCalendar() {
    setConnecting(true)
    try {
      const res = await fetch('/api/fitter/google/auth-url')
      if (!res.ok) throw new Error('Failed to get auth URL')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setConnecting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--warm-800)]">Google Calendar</h2>
          <p className="text-[11px] text-[var(--warm-500)]">
            Sync fitting jobs to your Google Calendar
          </p>
        </div>
        {status === 'connected' && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Connected
          </span>
        )}
      </div>

      {status === 'connected' ? (
        <p className="text-xs text-green-600">
          Your calendar is connected. New jobs will automatically appear in your Google Calendar.
        </p>
      ) : (
        <button
          onClick={connectCalendar}
          disabled={connecting}
          className="w-full px-4 py-2.5 bg-white border border-[var(--warm-200)] text-sm font-medium text-[var(--warm-700)] rounded-lg hover:bg-[var(--warm-50)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {connecting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Connect Google Calendar
        </button>
      )}
    </div>
  )
}
