'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type { Lead, OpportunityWithLead, Task, Booking, MessageLog, MessageChannel, StageLog } from './types'

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
  // Track the log ID returned by the suggest endpoint so feedback can reference it
  const logIdRef = useRef<string | null>(null)

  const query = useQuery<AISuggestion>({
    queryKey: ['ai_suggestion', lead?.id, opportunity?.id, opportunity?.stage],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, opportunity, tasks, bookings, messages }),
      })
      if (!res.ok) throw new Error('AI suggestion failed')
      const data = await res.json()
      // suggest route returns { suggestion, log_id }
      if (data.log_id) logIdRef.current = data.log_id
      return data.suggestion ?? data
    },
    enabled: !!lead,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  /** Call after the user acts on or dismisses the suggestion */
  async function logFeedback(outcome: 'accepted' | 'dismissed' | 'snoozed') {
    const logId = logIdRef.current
    if (!logId) return
    await fetch('/api/crm/ai/suggestion-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId, outcome }),
    }).catch(() => {/* non-critical — ignore errors */})
  }

  return { ...query, logFeedback }
}

// ─── AI Compose ──────────────────────────────────────────────────────────────

export interface ComposeRequest {
  lead: Lead
  opportunity?: OpportunityWithLead | null
  channel: MessageChannel
  tone: 'formal' | 'friendly' | 'brief'
  intent?: string
  recentMessages?: MessageLog[]
  customInstructions?: string
}

export interface ComposeResult {
  subject?: string
  body: string
  tone_used: string
  tokens_used: number
}

export function useAICompose() {
  return useMutation<ComposeResult, Error, ComposeRequest>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/crm/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'AI compose failed' }))
        throw new Error(err.error || 'AI compose failed')
      }
      return res.json()
    },
  })
}

// ─── AI Daily Briefing ───────────────────────────────────────────────────────

export interface AIBriefing {
  greeting: string
  summary: string
  highlights: { label: string; value: string; trend?: 'up' | 'down' | 'flat' }[]
  urgent_items: { lead_name: string; lead_id: string; action: string; urgency: 'high' | 'medium' }[]
  tip_of_the_day: string
  generated_at: string
}

export function useAIBriefing(userName: string | undefined, enabled: boolean) {
  return useQuery<AIBriefing>({
    queryKey: ['ai_briefing'],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName }),
      })
      if (!res.ok) throw new Error('AI briefing failed')
      return res.json()
    },
    enabled,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

// ─── AI Activity Summary ─────────────────────────────────────────────────────

export interface AIActivitySummary {
  narrative: string
  key_milestones: string[]
  days_in_pipeline: number
  engagement_level: 'high' | 'medium' | 'low'
  next_milestone: string
  risk_note?: string | null
}

export function useAIActivitySummary(
  lead: Lead | null | undefined,
  stageLog: StageLog[],
  messages: MessageLog[],
  tasks: Task[],
  bookings: Booking[],
  enabled: boolean,
) {
  return useQuery<AIActivitySummary>({
    queryKey: ['ai_activity_summary', lead?.id],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/activity-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, stageLog, messages, tasks, bookings }),
      })
      if (!res.ok) throw new Error('AI activity summary failed')
      return res.json()
    },
    enabled: !!lead && enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

// ─── AI Pipeline Health Check ────────────────────────────────────────────────

export interface PipelineHealthReport {
  health_score: number
  health_label: 'healthy' | 'attention_needed' | 'at_risk'
  executive_summary: string
  metrics: {
    label: string
    current: string
    prior: string
    trend: 'up' | 'down' | 'flat'
    insight: string
  }[]
  bottlenecks: {
    stage: string
    count: number
    avg_days: number
    recommendation: string
  }[]
  at_risk_deals: {
    lead_name: string
    lead_id: string
    stage: string
    days_stuck: number
    risk_reason: string
    suggested_action: string
  }[]
  win_loss: {
    won: number
    lost: number
    win_rate: number
    top_lost_reason: string
    insight: string
  }
  recommendations: {
    priority: 'high' | 'medium'
    action: string
    expected_impact: string
  }[]
  period_start: string
  period_end: string
  generated_at: string
}

export function useAIPipelineHealth(enabled: boolean) {
  const queryClient = useQueryClient()

  const query = useQuery<PipelineHealthReport>({
    queryKey: ['ai_pipeline_health'],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/pipeline-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) throw new Error(`Pipeline health check failed (${res.status})`)
      return res.json()
    },
    enabled,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  /** Force a fresh OpenAI call, bypassing the server-side cache */
  async function forceRefresh() {
    await queryClient.cancelQueries({ queryKey: ['ai_pipeline_health'] })
    return queryClient.fetchQuery({
      queryKey: ['ai_pipeline_health'],
      queryFn: async () => {
        const res = await fetch('/api/crm/ai/pipeline-health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        })
        if (!res.ok) throw new Error(`Pipeline health check failed (${res.status})`)
        return res.json()
      },
      staleTime: 0,
    })
  }

  return { ...query, forceRefresh }
}

// ─── AI Evening Digest ───────────────────────────────────────────────────────

export interface EveningDigest {
  headline: string
  today_summary: string
  tomorrow_prep: { lead_name: string; lead_id: string; action: string; context: string }[]
  wins_today: string[]
  watch_list: { lead_name: string; lead_id: string; concern: string }[]
  close_of_day_tip: string
  generated_at: string
}

export function useAIEveningDigest(userName: string | undefined, enabled: boolean) {
  return useQuery<EveningDigest>({
    queryKey: ['ai_evening_digest'],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/evening-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName }),
      })
      if (!res.ok) throw new Error('Evening digest failed')
      return res.json()
    },
    enabled,
    staleTime: 60 * 60 * 1000, // valid for 1 hour
    refetchOnWindowFocus: false,
    retry: false,
  })
}

// ─── AI Pre-call Brief ───────────────────────────────────────────────────────

export interface PreCallBrief {
  lead_name: string
  lead_id: string
  call_type: string
  scheduled_at: string
  key_points: string[]
  suggested_opener: string
  watch_out_for: string | null
  target_outcome: string
}

export function useAIPreCallBrief(
  leadId: string | null | undefined,
  opportunityId: string | null | undefined,
  bookingType: string | null | undefined,
  enabled: boolean,
) {
  return useQuery<PreCallBrief>({
    queryKey: ['ai_pre_call_brief', leadId, opportunityId],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/pre-call-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, opportunity_id: opportunityId, booking_type: bookingType }),
      })
      if (!res.ok) throw new Error('Pre-call brief failed')
      return res.json()
    },
    enabled: !!leadId && enabled,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
}

