import type { AISuggestion } from '@/lib/crm/types'

export interface CalendarEvent {
  id: string
  eventType: 'call1' | 'call2' | 'onboarding' | 'visit' | 'fitting' | 'task'
  title: string          // Lead name or task description
  startTime: string      // ISO 8601
  durationMin?: number
  outcome: string        // pending, completed, no_show, cancelled, open, done
  meetLink?: string
  address?: string
  notes?: string
  googleEventId?: string
  // Lead/opportunity context
  leadId?: string
  opportunityId?: string
  stage?: string
  package?: string
  value?: number
  entryRoute?: string
  aiSuggestion?: AISuggestion | null
  // Styling
  color: {
    bg: string
    border: string
    text: string
    dot: string
  }
}

export const EVENT_COLORS: Record<string, CalendarEvent['color']> = {
  call1:      { bg: 'bg-blue-50',    border: 'border-l-blue-400',    text: 'text-blue-600',    dot: 'bg-blue-400' },
  call2:      { bg: 'bg-violet-50',  border: 'border-l-violet-400',  text: 'text-violet-600',  dot: 'bg-violet-400' },
  onboarding: { bg: 'bg-amber-50',   border: 'border-l-amber-400',   text: 'text-amber-600',   dot: 'bg-amber-400' },
  visit:      { bg: 'bg-emerald-50', border: 'border-l-emerald-400', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  fitting:    { bg: 'bg-rose-50',    border: 'border-l-rose-400',    text: 'text-rose-600',    dot: 'bg-rose-400' },
  task:       { bg: 'bg-gray-50',    border: 'border-l-gray-400',    text: 'text-gray-600',    dot: 'bg-gray-400' },
}

export const EVENT_LABELS: Record<string, string> = {
  call1:      'Discovery Call',
  call2:      'Design Review',
  onboarding: 'Onboarding',
  visit:      'Site Visit',
  fitting:    'Fitting',
  task:       'Task',
}

export const EVENT_ICONS: Record<string, string> = {
  call1:      '📞',
  call2:      '🎥',
  onboarding: '🏠',
  visit:      '📍',
  fitting:    '🔧',
  task:       '✓',
}
