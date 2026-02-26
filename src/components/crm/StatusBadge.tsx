import { STAGES } from '@/lib/crm/stages'
import type { OpportunityStage } from '@/lib/crm/types'

interface StatusBadgeProps {
  stage: OpportunityStage
  size?: 'sm' | 'md'
}

export default function StatusBadge({ stage, size = 'sm' }: StatusBadgeProps) {
  const config = STAGES[stage]
  if (!config) return null

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${config.color} ${config.textColor}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  )
}
