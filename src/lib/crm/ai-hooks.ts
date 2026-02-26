'use client'

import { useQuery } from '@tanstack/react-query'
import type { Lead, OpportunityWithLead, Task, Booking, MessageLog } from './types'

export interface AIScore {
  score: number
  tier: 'hot' | 'warm' | 'cold'
  summary: string
  factors: { label: string; score: number; max: number; insight: string }[]
  closing_tip: string
}

export interface AISuggestion {
  action: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
  script_hint?: string
  risk?: string
}

export function useAIScore(lead: Lead | null | undefined, opportunity: OpportunityWithLead | null) {
  return useQuery<AIScore>({
    queryKey: ['ai_score', lead?.id, opportunity?.id],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, opportunity }),
      })
      if (!res.ok) throw new Error('AI scoring failed')
      return res.json()
    },
    enabled: !!lead,
    staleTime: 5 * 60 * 1000, // cache for 5 min
    retry: 1,
  })
}

export function useAISuggestion(
  lead: Lead | null | undefined,
  opportunity: OpportunityWithLead | null,
  tasks: Task[],
  bookings: Booking[],
  messages: MessageLog[],
) {
  return useQuery<AISuggestion>({
    queryKey: ['ai_suggestion', lead?.id, opportunity?.id, opportunity?.stage],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, opportunity, tasks, bookings, messages }),
      })
      if (!res.ok) throw new Error('AI suggestion failed')
      return res.json()
    },
    enabled: !!lead,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
