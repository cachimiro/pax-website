'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
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
  return useQuery<PipelineHealthReport>({
    queryKey: ['ai_pipeline_health'],
    queryFn: async () => {
      const res = await fetch('/api/crm/ai/pipeline-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) throw new Error('Pipeline health check failed')
      return res.json()
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour cache
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

