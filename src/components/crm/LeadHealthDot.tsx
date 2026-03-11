'use client'

import { isFuture } from 'date-fns'
import { Clock } from 'lucide-react'
import type { Lead } from '@/lib/crm/types'

export type HealthTier = 'hot' | 'warm' | 'cold' | 'snoozed'

export function computeHealth(
  lead: Lead,
  hasOpenOpp: boolean,
  overdueTasks: number,
  daysSinceContact: number,
): { tier: HealthTier; tooltip: string } {
  if (lead.snoozed_until && isFuture(new Date(lead.snoozed_until))) {
    return { tier: 'snoozed', tooltip: 'Snoozed — nudges paused' }
  }
  if (hasOpenOpp && daysSinceContact <= 7 && overdueTasks === 0) {
    return { tier: 'hot', tooltip: `Hot — last contacted ${daysSinceContact}d ago` }
  }
  if (hasOpenOpp && daysSinceContact <= 21 && overdueTasks <= 1) {
    return { tier: 'warm', tooltip: `Warm — last contacted ${daysSinceContact}d ago${overdueTasks ? ', 1 overdue task' : ''}` }
  }
  const parts: string[] = []
  if (!hasOpenOpp) parts.push('no open opportunity')
  if (daysSinceContact > 21) parts.push(`last contacted ${daysSinceContact}d ago`)
  if (overdueTasks >= 2) parts.push(`${overdueTasks} overdue tasks`)
  return { tier: 'cold', tooltip: `Cold — ${parts.join(', ')}` }
}

interface Props {
  lead: Lead
  hasOpenOpp: boolean
  overdueTasks: number
  daysSinceContact: number
}

export default function LeadHealthDot({ lead, hasOpenOpp, overdueTasks, daysSinceContact }: Props) {
  const { tier, tooltip } = computeHealth(lead, hasOpenOpp, overdueTasks, daysSinceContact)

  if (tier === 'snoozed') {
    return (
      <span title={tooltip} className="inline-flex items-center justify-center w-4 h-4">
        <Clock size={11} className="text-blue-400" />
      </span>
    )
  }

  const colors: Record<string, string> = {
    hot: 'bg-emerald-500',
    warm: 'bg-amber-400',
    cold: 'bg-[var(--warm-300)]',
  }

  return (
    <span title={tooltip} className="inline-flex items-center justify-center w-4 h-4">
      <span className={`w-2 h-2 rounded-full ${colors[tier]} ${tier === 'hot' ? 'animate-pulse' : ''}`} />
    </span>
  )
}
