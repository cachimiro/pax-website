'use client'

import PipelineBoard from '@/components/crm/PipelineBoard'
import PipelineHealthCheck from '@/components/crm/PipelineHealthCheck'

export default function PipelinePage() {
  return (
    // overflow-hidden here prevents the page from growing taller than the viewport,
    // which lets the board's overflow-x-auto actually scroll horizontally
    <div className="h-full flex flex-col overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">Pipeline</h1>
        <p className="text-sm text-[var(--warm-500)] mt-0.5">Drag opportunities between stages to progress deals</p>
      </div>

      <div className="mb-4 flex-shrink-0">
        <PipelineHealthCheck />
      </div>

      {/* flex-1 min-h-0 lets the board fill remaining height without overflowing */}
      <div className="flex-1 min-h-0">
        <PipelineBoard />
      </div>
    </div>
  )
}
