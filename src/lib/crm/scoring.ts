import type { Lead, Opportunity } from './types'
import { differenceInHours } from 'date-fns'

export interface LeadScore {
  total: number        // 0-100
  tier: 'hot' | 'warm' | 'cold'
  factors: { label: string; score: number; max: number }[]
}

/**
 * Score a lead 0-100 based on weighted factors.
 * Budget 30%, Location 20%, Response speed 20%, Project complexity 15%, Engagement 15%
 */
export function scoreLead(lead: Lead, opportunity?: Opportunity | null): LeadScore {
  const factors: LeadScore['factors'] = []

  // 1. Budget band (30 pts)
  const budgetScore = scoreBudget(lead.budget_band)
  factors.push({ label: 'Budget', score: budgetScore, max: 30 })

  // 2. Location match (20 pts) — valid UK postcode scores well
  const locationScore = scoreLocation(lead.postcode)
  factors.push({ label: 'Location', score: locationScore, max: 20 })

  // 3. Response speed (20 pts) — how quickly they booked after first visit
  const speedScore = scoreResponseSpeed(lead)
  factors.push({ label: 'Response Speed', score: speedScore, max: 20 })

  // 4. Project complexity (15 pts) — higher value projects score more
  const complexityScore = scoreComplexity(lead.project_type, opportunity?.value_estimate)
  factors.push({ label: 'Project Value', score: complexityScore, max: 15 })

  // 5. Engagement (15 pts) — has phone, email, filled in details
  const engagementScore = scoreEngagement(lead)
  factors.push({ label: 'Engagement', score: engagementScore, max: 15 })

  const total = Math.min(100, factors.reduce((sum, f) => sum + f.score, 0))
  const tier = total >= 70 ? 'hot' : total >= 40 ? 'warm' : 'cold'

  return { total, tier, factors }
}

function scoreBudget(budgetBand?: string | null): number {
  if (!budgetBand) return 10 // unknown = mid-low
  const b = budgetBand.toLowerCase()
  if (b.includes('5000') || b.includes('premium') || b.includes('luxury')) return 30
  if (b.includes('3000') || b.includes('4000') || b.includes('mid')) return 22
  if (b.includes('2000') || b.includes('standard')) return 15
  if (b.includes('1000') || b.includes('budget')) return 8
  return 12
}

function scoreLocation(postcode?: string | null): number {
  if (!postcode) return 5
  // Any valid UK postcode format scores well — no geographic bias
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase()
  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned)) return 18
  return 8
}

function scoreResponseSpeed(lead: Lead): number {
  if (!lead.first_visit_at) return 10
  const hoursToEnquiry = differenceInHours(new Date(lead.created_at), new Date(lead.first_visit_at))
  if (hoursToEnquiry <= 1) return 20   // same session
  if (hoursToEnquiry <= 24) return 16  // same day
  if (hoursToEnquiry <= 72) return 12  // within 3 days
  if (hoursToEnquiry <= 168) return 8  // within a week
  return 5
}

function scoreComplexity(projectType?: string | null, value?: number | null): number {
  if (value && value >= 5000) return 15
  if (value && value >= 3000) return 11
  if (value && value >= 1500) return 7

  if (!projectType) return 5
  const p = projectType.toLowerCase()
  if (p.includes('walk-in') || p.includes('dressing room') || p.includes('his & hers')) return 14
  if (p.includes('fitted') || p.includes('sliding')) return 10
  if (p.includes('storage') || p.includes('shelving')) return 6
  return 7
}

function scoreEngagement(lead: Lead): number {
  let score = 0
  if (lead.phone) score += 4
  if (lead.email) score += 3
  if (lead.postcode) score += 3
  if (lead.project_type) score += 3
  if (lead.budget_band) score += 2
  return Math.min(15, score)
}

export function getScoreColor(tier: LeadScore['tier']): string {
  return {
    hot: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200',
    warm: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200',
    cold: 'text-[var(--warm-500)] bg-[var(--warm-50)] ring-1 ring-[var(--warm-200)]',
  }[tier]
}
