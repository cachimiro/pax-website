'use client'

import {
  ClipboardList, Home, Layers, Wrench, AlertTriangle,
  CheckCircle2, HelpCircle, XCircle, FileText, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import type { Meet1Notes, ObstacleState } from '@/lib/crm/types'

interface DiscoveryAnswersCardProps {
  meet1Notes: Meet1Notes | null | undefined
  isLoading?: boolean
}

const OBSTACLE_LABELS: { key: keyof Meet1Notes; label: string }[] = [
  { key: 'obstacle_bed',          label: 'Bed' },
  { key: 'obstacle_radiator',     label: 'Radiator' },
  { key: 'obstacle_curtain_rail', label: 'Curtain rail' },
  { key: 'obstacle_coving',       label: 'Coving' },
  { key: 'obstacle_picture_rail', label: 'Picture rail' },
]

const FINISH_LABELS: Record<string, string> = {
  skirting_board: 'Skirting board',
  flush_fit:      'Flush fit',
  cornice:        'Cornice',
  other:          'Other',
}

const PACKAGE_LABELS: Record<string, string> = {
  budget:      'Budget',
  paxbespoke:  'PaxBespoke',
  select:      'Select',
}

function ObstacleIcon({ state }: { state: ObstacleState }) {
  if (state === 'present')     return <CheckCircle2 size={11} className="text-amber-500 shrink-0" />
  if (state === 'not_present') return <XCircle size={11} className="text-[var(--warm-300)] shrink-0" />
  return <HelpCircle size={11} className="text-[var(--warm-300)] shrink-0" />
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-[var(--warm-300)] mt-0.5 shrink-0">{icon}</span>
      <span className="text-[10px] font-medium text-[var(--warm-400)] w-24 shrink-0">{label}</span>
      <span className="text-xs text-[var(--warm-700)] flex-1">{value}</span>
    </div>
  )
}

export default function DiscoveryAnswersCard({ meet1Notes, isLoading }: DiscoveryAnswersCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return null

  return (
    <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--warm-50)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={13} className="text-[var(--warm-400)]" />
          <span className="text-[11px] font-semibold text-[var(--warm-600)]">Discovery answers</span>
          {meet1Notes?.completed && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              Meet 1 done
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={13} className="text-[var(--warm-300)]" />
          : <ChevronDown size={13} className="text-[var(--warm-300)]" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--warm-50)]">
          {!meet1Notes ? (
            <p className="text-xs text-[var(--warm-400)] py-3 text-center">Meet 1 not completed yet.</p>
          ) : (
            <div className="divide-y divide-[var(--warm-50)]">
              {meet1Notes.room_confirmed && (
                <Row icon={<Home size={11} />} label="Room" value={meet1Notes.room_confirmed} />
              )}

              {meet1Notes.package_confirmed && (
                <Row
                  icon={<Layers size={11} />}
                  label="Package"
                  value={PACKAGE_LABELS[meet1Notes.package_confirmed] ?? meet1Notes.package_confirmed}
                />
              )}

              {meet1Notes.space_constraints && meet1Notes.space_constraints.length > 0 && (
                <Row
                  icon={<AlertTriangle size={11} />}
                  label="Constraints"
                  value={
                    <div className="flex flex-wrap gap-1">
                      {meet1Notes.space_constraints.map(c => (
                        <span key={c} className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded">
                          {c.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  }
                />
              )}

              {meet1Notes.finish_type && (
                <Row
                  icon={<Wrench size={11} />}
                  label="Finish"
                  value={FINISH_LABELS[meet1Notes.finish_type] ?? meet1Notes.finish_type}
                />
              )}

              {/* Obstacles — only show present/unknown ones */}
              {(() => {
                const present = OBSTACLE_LABELS.filter(o => meet1Notes[o.key] === 'present')
                const unknown = OBSTACLE_LABELS.filter(o => meet1Notes[o.key] === 'unknown')
                if (present.length === 0 && unknown.length === 0) return null
                return (
                  <Row
                    icon={<AlertTriangle size={11} />}
                    label="Obstacles"
                    value={
                      <div className="space-y-0.5">
                        {present.map(o => (
                          <div key={o.key} className="flex items-center gap-1">
                            <ObstacleIcon state="present" />
                            <span className="text-[11px] text-amber-700">{o.label}</span>
                          </div>
                        ))}
                        {unknown.map(o => (
                          <div key={o.key} className="flex items-center gap-1">
                            <ObstacleIcon state="unknown" />
                            <span className="text-[11px] text-[var(--warm-400)]">{o.label} (TBC)</span>
                          </div>
                        ))}
                        {meet1Notes.obstacle_other && (
                          <div className="flex items-center gap-1">
                            <ObstacleIcon state="present" />
                            <span className="text-[11px] text-amber-700">{meet1Notes.obstacle_other}</span>
                          </div>
                        )}
                      </div>
                    }
                  />
                )
              })()}

              {meet1Notes.call_notes && (
                <Row
                  icon={<FileText size={11} />}
                  label="Notes"
                  value={<span className="whitespace-pre-wrap">{meet1Notes.call_notes}</span>}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
