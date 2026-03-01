'use client'

import PipelineBoard from '@/components/crm/PipelineBoard'
import PipelineHealthCheck from '@/components/crm/PipelineHealthCheck'

export default function PipelinePage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">Pipeline</h1>
        <p className="text-sm text-[var(--warm-500)] mt-0.5">Drag opportunities between stages to progress deals</p>
      </div>

      <div className="mb-5">
        <PipelineHealthCheck />
      </div>

      <PipelineBoard />
    </div>
  )
}
