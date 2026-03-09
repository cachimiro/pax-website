'use client'

import { Home, Palette, Package, PoundSterling, Clock, MapPin, TrendingUp } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { Lead, OpportunityWithLead } from '@/lib/crm/types'
import type { ParsedLeadNotes } from '@/lib/crm/utils'

interface ProjectSummaryCardProps {
  lead: Lead
  parsedNotes: ParsedLeadNotes
  opportunity: OpportunityWithLead | null
}

const CHIP_ICONS: Record<string, React.ReactNode> = {
  Room:      <Home size={11} />,
  Style:     <Palette size={11} />,
  Package:   <Package size={11} />,
  Budget:    <PoundSterling size={11} />,
  Timeline:  <Clock size={11} />,
  Location:  <MapPin size={11} />,
}

function formatBudget(value: string): string {
  // "1000-2000" → "£1,000–£2,000"
  const match = value.match(/^(\d+)-(\d+)$/)
  if (match) {
    const lo = parseInt(match[1]).toLocaleString('en-GB')
    const hi = parseInt(match[2]).toLocaleString('en-GB')
    return `£${lo}–£${hi}`
  }
  return value
}

function formatValue(label: string, value: string): string {
  if (label === 'Budget') return formatBudget(value)
  // Capitalise first letter
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function ProjectSummaryCard({ lead, parsedNotes, opportunity }: ProjectSummaryCardProps) {
  // Merge parsed notes with top-level lead fields (notes take priority for display)
  const noteKeys = new Set(parsedNotes.fields.map(f => f.label))

  const extraFields: { label: string; value: string }[] = []
  if (!noteKeys.has('Room') && lead.project_type) {
    extraFields.push({ label: 'Room', value: lead.project_type })
  }
  if (!noteKeys.has('Budget') && lead.budget_band) {
    extraFields.push({ label: 'Budget', value: lead.budget_band })
  }

  const allFields = [...parsedNotes.fields, ...extraFields]

  if (allFields.length === 0 && !opportunity) return null

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
      <p className="text-[10px] font-semibold text-[var(--warm-400)] uppercase tracking-wider mb-3">
        Project
      </p>

      {/* Stage + value */}
      {opportunity && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--warm-50)]">
          <StatusBadge stage={opportunity.stage} />
          {opportunity.value_estimate != null && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--green-700)] bg-[var(--green-50)] px-2 py-0.5 rounded-full">
              <TrendingUp size={10} />
              £{opportunity.value_estimate.toLocaleString('en-GB')}
            </span>
          )}
        </div>
      )}

      {/* Chips */}
      {allFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allFields.map(({ label, value }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 bg-[var(--warm-50)] border border-[var(--warm-100)] rounded-lg px-2 py-1 text-[11px] text-[var(--warm-700)]"
            >
              <span className="text-[var(--warm-400)]">{CHIP_ICONS[label] ?? null}</span>
              <span className="text-[var(--warm-400)] font-medium">{label}:</span>
              <span>{formatValue(label, value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
